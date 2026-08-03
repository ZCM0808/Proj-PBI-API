
new_code = r'''
// === Local Model DAX: Collapse/Expand the editor section ===
window._localDaxEditorOpen = true;
window.toggleLocalDaxEditor = function() {
    const body = document.getElementById('wf-local-dax-body');
    const chevron = document.getElementById('wf-local-dax-chevron');
    const copyBtn = document.getElementById('wf-local-dax-copy-btn');
    if (!body) return;
    window._localDaxEditorOpen = !window._localDaxEditorOpen;
    const open = window._localDaxEditorOpen;
    if (open) {
        body.style.display = 'block';
        requestAnimationFrame(() => { body.style.opacity = '1'; });
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        if (copyBtn) { copyBtn.style.opacity = '1'; copyBtn.style.pointerEvents = 'auto'; }
    } else {
        body.style.opacity = '0';
        setTimeout(() => { body.style.display = 'none'; }, 250);
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
        if (copyBtn) { copyBtn.style.opacity = '0'; copyBtn.style.pointerEvents = 'none'; }
    }
};

// === DAX Query Results: Open resizable popup modal ===
window.openDaxResultModal = function() {
    const src = document.getElementById('wf-local-result');
    if (!src || !src.innerHTML.trim()) {
        window.showNotification('No results to expand yet.', 'info');
        return;
    }
    // Reuse existing overlay
    let overlay = document.getElementById('dax-result-expand-overlay');
    if (overlay) {
        document.getElementById('dax-result-expand-body').innerHTML = src.innerHTML;
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.querySelector('.dax-expand-panel').style.transform = 'scale(1)';
        });
        return;
    }
    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'dax-result-expand-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9000;opacity:0;transition:opacity 0.25s;';
    // Panel
    const panel = document.createElement('div');
    panel.className = 'dax-expand-panel';
    panel.style.cssText = [
        'position:relative','background:var(--bg-color)','border:1px solid var(--panel-border)',
        'border-radius:10px','box-shadow:0 24px 80px rgba(0,0,0,0.5)',
        'width:88vw','height:80vh','min-width:400px','min-height:280px',
        'display:flex','flex-direction:column','overflow:hidden',
        'resize:both','transform:scale(0.94)','transition:transform 0.25s'
    ].join(';');
    // Header
    const statsText = (document.getElementById('wf-local-result-stats') || {}).textContent || '';
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--overlay-10);cursor:move;user-select:none;flex-shrink:0;background:var(--bg-color);';
    hdr.innerHTML = `
        <span style="font-size:0.85rem;font-weight:bold;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            DAX Query Results
            <span id="dax-expand-stats" style="color:var(--accent);font-weight:normal;font-size:0.75rem;">${statsText}</span>
        </span>
        <div style="display:flex;align-items:center;gap:8px;">
            <button class="wf-copy-btn" style="position:static;opacity:1;pointer-events:auto;"
                onclick="window.handleCopyAction(this,document.getElementById('dax-result-expand-body').innerText)"
                title="Copy Table">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="close-btn" id="dax-expand-close" title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        </div>`;
    // Body
    const body = document.createElement('div');
    body.id = 'dax-result-expand-body';
    body.style.cssText = 'flex:1;overflow:auto;padding:12px;white-space:normal;';
    body.innerHTML = src.innerHTML;
    panel.appendChild(hdr);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        panel.style.transform = 'scale(1)';
    });
    // Close
    const closeModal = () => {
        overlay.style.opacity = '0';
        panel.style.transform = 'scale(0.94)';
        setTimeout(() => { overlay.style.display = 'none'; }, 250);
    };
    document.getElementById('dax-expand-close').onclick = closeModal;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    // Drag
    let sx, sy, sl, st;
    const onMove = (e) => { panel.style.left = (sl + e.clientX - sx) + 'px'; panel.style.top = (st + e.clientY - sy) + 'px'; };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    hdr.addEventListener('mousedown', (e) => {
        if (panel.style.position !== 'absolute') {
            const r = panel.getBoundingClientRect();
            panel.style.position = 'absolute'; panel.style.margin = '0';
            panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px';
        }
        sx = e.clientX; sy = e.clientY;
        sl = parseInt(panel.style.left) || 0; st = parseInt(panel.style.top) || 0;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
    });
};
'''

with open('static/script.js', 'a', encoding='utf-8') as f:
    f.write(new_code)

print('Done. Total lines:', open('static/script.js', encoding='utf-8').read().count('\n'))
