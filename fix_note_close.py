with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

bad_btn = '<button type="button" onclick="document.getElementById(\'note-error-detail-modal\').style.display=\'none\'" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem;">✕</button>'
good_btn = '<button type="button" class="close-btn" onclick="document.getElementById(\'note-error-detail-modal\').style.display=\'none\'" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>'

content = content.replace(bad_btn, good_btn)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed note error modal close button')
