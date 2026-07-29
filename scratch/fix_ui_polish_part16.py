import os
import re

INDEX_FILE = 'static/index.html'

with open(INDEX_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix whitespace rendering in table containers
rvc_old = '<div id="wf-out-rvc-table" class="wf-console" style="min-height: 150px; padding: 0 32px 60px 12px;"></div>'
rvc_new = '<div id="wf-out-rvc-table" class="wf-console" style="min-height: 150px; padding: 0 32px 60px 12px; white-space: normal;"></div>'
html = html.replace(rvc_old, rvc_new)

perms_old = '<div id="wf-out-perms-table" class="wf-console" style="min-height: 150px; padding: 0 32px 60px 12px;">Waiting for data...</div>'
perms_new = '<div id="wf-out-perms-table" class="wf-console" style="min-height: 150px; padding: 0 32px 60px 12px; white-space: normal;">Waiting for data...</div>'
html = html.replace(perms_old, perms_new)

html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v110_whitespace_fix', html)

with open(INDEX_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("Added white-space: normal to table containers to kill pre-wrap whitespace block!")
