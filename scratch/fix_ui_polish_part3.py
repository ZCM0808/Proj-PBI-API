import os

SCRIPT_FILE = 'static/script.js'

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix RVC visibility bug during loading
old_rvc_start = """    statusDiv.textContent = `Fetching Activity Events from ${startStr} to ${endStr}... (Requires Power BI Admin)`;
    outDiv.style.display = 'none';
    tbody.innerHTML = '';"""
new_rvc_start = """    statusDiv.textContent = `Fetching Activity Events from ${startStr} to ${endStr}... (Requires Power BI Admin)`;
    outDiv.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--text-secondary);">Loading data... please wait.</td></tr>';"""

if old_rvc_start in js:
    js = js.replace(old_rvc_start, new_rvc_start)

# 2. Fix the scroll reflow timing bug for wf-out consoles
js = js.replace('out.scrollTop = out.scrollHeight;', 'setTimeout(() => { out.scrollTop = out.scrollHeight; }, 50);')
js = js.replace('outDiv.scrollTop = outDiv.scrollHeight;', 'setTimeout(() => { outDiv.scrollTop = outDiv.scrollHeight; }, 50);')

with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixes applied.")
