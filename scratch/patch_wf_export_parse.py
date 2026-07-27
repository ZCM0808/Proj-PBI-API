import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Fix Step 1 parsing
step1_old = """                if (data.id) {
                    currentExportId = data.id;"""
step1_new = """                const exportId = (data.data && data.data.id) ? data.data.id : data.id;
                if (exportId) {
                    currentExportId = exportId;"""
script = script.replace(step1_old, step1_new)

# Fix Step 2 parsing
step2_old = """                if (data.status === 'Succeeded') {
                    logToConsole(2, `\\nExport Succeeded! Ready for Step 3.`);"""
step2_new = """                const status = (data.data && data.data.status) ? data.data.status : data.status;
                if (status === 'Succeeded') {
                    logToConsole(2, `\\nExport Succeeded! Ready for Step 3.`);"""
script = script.replace(step2_old, step2_new)

# Step 2 Failed parsing
step2_failed_old = """                } else if (data.status === 'Failed') {"""
step2_failed_new = """                } else if (status === 'Failed') {"""
script = script.replace(step2_failed_old, step2_failed_new)

# Bump version
script = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v29_export_id_fix', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v29_export_id_fix', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
    
print("Export ID parsing fix applied!")
