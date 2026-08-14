import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add flash animation helper
flash_helper = '''
window.flashCopiedElement = function(element) {
    if (!element) return;
    element.classList.remove('flash-success-anim');
    void element.offsetWidth; // trigger reflow
    element.classList.add('flash-success-anim');
    setTimeout(() => {
        element.classList.remove('flash-success-anim');
    }, 600);
};
'''

if 'window.flashCopiedElement' not in content:
    content = content.replace('window.handleCopyAction =', flash_helper + '\nwindow.handleCopyAction =')

# Replace copyReqBodyBtn
content = re.sub(r"(await navigator\.clipboard\.writeText\(bodyContent\);\s*)", r"\1\n                    window.flashCopiedElement(document.getElementById('graphql-editor-container').style.display !== 'none' ? document.getElementById('graphql-editor-container') : document.getElementById('req-body-container'));\n                    ", content)

# Replace copyResBodyBtn
content = re.sub(r"(await navigator\.clipboard\.writeText\(resContent\);\s*)", r"\1\n                    window.flashCopiedElement(document.getElementById('res-body-container'));\n                    ", content)

# Replace copyBtn (Main URL copy)
content = re.sub(r"(await navigator\.clipboard\.writeText\(document\.getElementById\('url'\)\.value\);\s*)", r"\1\n                window.flashCopiedElement(document.getElementById('url').closest('.url-container') || document.getElementById('url'));\n                ", content)

# Modify handleCopyAction
handle_copy_regex = r"(window\.handleCopyAction = function\(targetEl, text\) \{\s*if\(!text\) return;\s*navigator\.clipboard\.writeText\(text\)\.then\(\(\) => \{\s*)"
content = re.sub(handle_copy_regex, r"\1\n        let flashTarget = targetEl.closest('.input-with-copy, pre, textarea, .panel') || targetEl.previousElementSibling;\n        window.flashCopiedElement(flashTarget);\n", content)

# Fix DAX copy button
content = re.sub(r"(navigator\.clipboard\.writeText\(dax\)\.then\(\(\) => \{\s*)", r"\1\n                    window.flashCopiedElement(document.getElementById('wf-local-dax-preview'));\n", content)

# Fix logs copy button
content = re.sub(r"(navigator\.clipboard\.writeText\(logsText\)\.then\(\(\) => \{\s*)", r"\1\n                window.flashCopiedElement(document.getElementById('wf-rvc-logs-content'));\n", content)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated copy flashes')
