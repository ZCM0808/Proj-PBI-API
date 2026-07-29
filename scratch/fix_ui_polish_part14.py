import os
import re

INDEX_FILE = 'static/index.html'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # RVC Table container padding fix
    rvc_old = '<div id="wf-out-rvc-table" class="wf-console" style="min-height: 150px; padding-bottom: 60px;"></div>'
    rvc_new = '<div id="wf-out-rvc-table" class="wf-console" style="min-height: 150px; padding: 0 32px 60px 12px;"></div>'
    html = html.replace(rvc_old, rvc_new)

    # Perms Table container padding fix
    perms_old = '<div id="wf-out-perms-table" class="wf-console" style="min-height: 150px; padding-bottom: 60px;">Waiting for data...</div>'
    perms_new = '<div id="wf-out-perms-table" class="wf-console" style="min-height: 150px; padding: 0 32px 60px 12px;">Waiting for data...</div>'
    html = html.replace(perms_old, perms_new)

    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v109_sticky_header_fix', html)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    # Restore top: 0 for all sticky table headers
    js = js.replace('top: -12px;', 'top: 0;')

    with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
        f.write(js)

if __name__ == '__main__':
    patch_index()
    patch_script()
    print("Sticky header drop issue fixed!")
