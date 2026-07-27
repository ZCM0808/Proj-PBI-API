"""
Fix all hardcoded button colors in index.html and script.js to use CSS variables.
"""

# ── CSS additions ──────────────────────────────────────────────────────────────
new_css = """
/* =====================================================================
   Semantic button utility classes - theme-aware, no hardcoded colors
   ===================================================================== */

/* Verify / Confirm action (green tint) */
.btn-verify {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: var(--success);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-verify:hover {
    background: rgba(16, 185, 129, 0.22);
    border-color: var(--success);
}

/* Scan action (purple tint) */
.btn-scan {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--badge-custom-bg);
    border: 1px solid rgba(167, 139, 250, 0.35);
    color: var(--badge-custom-text);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-scan:hover {
    background: rgba(167, 139, 250, 0.25);
    border-color: var(--badge-custom-text);
}

/* Add row action (green tint) */
.btn-add-row {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: var(--success);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-add-row:hover {
    background: rgba(16, 185, 129, 0.22);
    border-color: var(--success);
}

/* Insert API link button (blue tint) */
.btn-insert-api {
    padding: 0.65rem 1rem;
    font-size: 0.9rem;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--badge-get-bg);
    color: var(--badge-get-text);
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
}
.btn-insert-api:hover {
    background: rgba(56, 189, 248, 0.2);
    border-color: var(--badge-get-text);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
}

/* Scan modal cancel button */
.btn-scan-cancel {
    background: var(--overlay-10);
    border: 1px solid var(--panel-border);
    color: var(--text-primary);
    width: auto;
    padding: 6px 12px;
}

/* Scan modal add button */
.btn-scan-add {
    background: var(--badge-custom-bg);
    color: var(--badge-custom-text);
    border: 1px solid rgba(167, 139, 250, 0.3);
    width: auto;
    padding: 6px 12px;
}
"""

with open('D:/ZCM/Proj-PBI-API/static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace('\r\n', '\n').replace('\r', '\n')

# Insert before the last closing comment block
marker = '\n/* Custom dialog modal (alert/confirm) */'
css = css.replace(marker, new_css + marker)

with open('D:/ZCM/Proj-PBI-API/static/style.css', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(css)

print("CSS updated.")

# ── index.html fixes ───────────────────────────────────────────────────────────
with open('D:/ZCM/Proj-PBI-API/static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Insert API Link button
html = html.replace(
    'class="btn-action" style="padding: 0.75rem 1rem; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); transition: all 0.2s; border-radius: 8px; " onclick="insertLinkedApiIntoNote()"',
    'class="btn-insert-api" onclick="insertLinkedApiIntoNote()"'
)

# 2. Verify settings button (Azure Auth)
html = html.replace(
    'id="verify-settings-btn" title="Verify Auth" style="background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; cursor: pointer; font-size: 0.7rem; border-radius: 4px; padding: 2px 6px;"',
    'id="verify-settings-btn" title="Verify Auth" class="btn-verify"'
)

# 3. Verify SQL button
html = html.replace(
    'id="verify-sql-btn" title="Verify SQL Connection" style="background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; cursor: pointer; font-size: 0.7rem; border-radius: 4px; padding: 2px 6px;"',
    'id="verify-sql-btn" title="Verify SQL Connection" class="btn-verify"'
)

# 4-6. Workspaces row buttons
html = html.replace(
    'onclick="verifySelectedGuid(\'groups\', \'workspace-list\', event)" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; border-radius: 4px; cursor: pointer;" title="Verify Selected"',
    'onclick="verifySelectedGuid(\'groups\', \'workspace-list\', event)" class="btn-verify" title="Verify Selected"'
)
html = html.replace(
    'onclick="scanItems(\'workspaces\', event)" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.3); color: #a78bfa; border-radius: 4px; cursor: pointer;"',
    'onclick="scanItems(\'workspaces\', event)" class="btn-scan"'
)
html = html.replace(
    'onclick="addListRow(\'workspace-list\')" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; border-radius: 4px; cursor: pointer;"',
    'onclick="addListRow(\'workspace-list\')" class="btn-add-row"'
)

# 7-9. Datasets row buttons
html = html.replace(
    'onclick="verifySelectedGuid(\'datasets\', \'dataset-list\', event)" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; border-radius: 4px; cursor: pointer;" title="Verify Selected"',
    'onclick="verifySelectedGuid(\'datasets\', \'dataset-list\', event)" class="btn-verify" title="Verify Selected"'
)
html = html.replace(
    'onclick="scanItems(\'datasets\', event)" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.3); color: #a78bfa; border-radius: 4px; cursor: pointer;"',
    'onclick="scanItems(\'datasets\', event)" class="btn-scan"'
)
html = html.replace(
    'onclick="addListRow(\'dataset-list\')" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; border-radius: 4px; cursor: pointer;"',
    'onclick="addListRow(\'dataset-list\')" class="btn-add-row"'
)

# 10-12. Reports row buttons
html = html.replace(
    'onclick="verifySelectedGuid(\'reports\', \'report-list\', event)" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; border-radius: 4px; cursor: pointer;" title="Verify Selected"',
    'onclick="verifySelectedGuid(\'reports\', \'report-list\', event)" class="btn-verify" title="Verify Selected"'
)
html = html.replace(
    'onclick="scanItems(\'reports\', event)" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.3); color: #a78bfa; border-radius: 4px; cursor: pointer;"',
    'onclick="scanItems(\'reports\', event)" class="btn-scan"'
)
html = html.replace(
    'onclick="addListRow(\'report-list\')" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; border-radius: 4px; cursor: pointer;"',
    'onclick="addListRow(\'report-list\')" class="btn-add-row"'
)

# 13. Scan modal cancel
html = html.replace(
    'class="btn-pipeline" style="background: rgba(255,255,255,0.1); color: #fff; width: auto; padding: 6px 12px;" onclick="document.getElementById(\'scan-modal\').style.display=\'none\'"',
    'class="btn-pipeline btn-scan-cancel" onclick="document.getElementById(\'scan-modal\').style.display=\'none\'"'
)

# 14. Scan modal add selected
html = html.replace(
    'class="btn-pipeline" style="width: auto; padding: 6px 12px; background: rgba(167, 139, 250, 0.2); color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.3);" id="scan-modal-add-btn"',
    'class="btn-pipeline btn-scan-add" id="scan-modal-add-btn"'
)

# 15. Editor wrapper hardcoded white bg + dark text
html = html.replace(
    'style="flex: 1; background: white; border-radius: 4px; overflow: hidden; color: #333; min-height: 380px;"',
    'style="flex: 1; border-radius: 4px; overflow: hidden; min-height: 380px;"'
)

# Bump version
import re
html = re.sub(r'style\.css\?v=[^"]+', 'style.css?v=20260722_v95', html)
html = re.sub(r'script\.js\?v=[^"]+', 'script.js?v=20260722_v95', html)

with open('D:/ZCM/Proj-PBI-API/static/index.html', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(html)

print("index.html updated.")

# ── script.js fixes ────────────────────────────────────────────────────────────
with open('D:/ZCM/Proj-PBI-API/static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# History list delete button: replace hardcoded dark gray with CSS var
js = js.replace(
    "delBtn.style.cssText = 'font-size: 1.1rem; color: #6e7681; cursor: pointer; padding: 0 4px; border-radius: 4px; line-height: 1; margin-top: -2px;';",
    "delBtn.style.cssText = 'font-size: 1.1rem; color: var(--text-secondary); cursor: pointer; padding: 0 4px; border-radius: 4px; line-height: 1; margin-top: -2px;';"
)

# History list insert-note button
js = js.replace(
    "insertNoteHistoryBtn.style.cssText = 'font-size: 1rem; color: #6e7681; cursor: pointer; padding: 0 4px; border-radius: 4px; line-height: 1; margin-top: -1px; margin-right: 4px;';",
    "insertNoteHistoryBtn.style.cssText = 'font-size: 1rem; color: var(--text-secondary); cursor: pointer; padding: 0 4px; border-radius: 4px; line-height: 1; margin-top: -1px; margin-right: 4px;';"
)

# Body preview in history
js = js.replace(
    "bodyPreview.style.cssText = 'font-size: 0.75rem; color: #8b949e; font-family: \"Fira Code\", monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: rgba(0,0,0,0.2); padding: 4px 6px; border-radius: 4px;';",
    "bodyPreview.style.cssText = 'font-size: 0.75rem; color: var(--text-secondary); font-family: \"Fira Code\", monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: var(--input-bg); padding: 4px 6px; border-radius: 4px;';"
)

# History empty state
js = js.replace(
    "historyListContainer.innerHTML = '<div style=\"padding: 16px; color: #6e7681; font-size: 0.85rem; text-align: center;\">📜 暂无记录 (No Records Found)</div>';",
    "historyListContainer.innerHTML = '<div style=\"padding: 16px; color: var(--text-secondary); font-size: 0.85rem; text-align: center;\">📜 暂无记录 (No Records Found)</div>';"
)

# History URL preview span colors
js = js.replace(
    '`<span style="color:#8b949e; font-family: \'Fira Code\', monospace; word-break: break-all; line-height: 1.4;">',
    '`<span style="color: var(--text-secondary); font-family: \'Fira Code\', monospace; word-break: break-all; line-height: 1.4;">'
)
js = js.replace(
    '<span style="color: #6e7681; opacity: 0.7;">${prefix}</span>',
    '<span style="color: var(--text-secondary); opacity: 0.7;">${prefix}</span>'
)

# Pipeline table button
js = js.replace(
    "tableBtn.style.cssText = 'margin-left: 8px; padding: 2px 6px; font-size: 0.65rem; background: rgba(167, 139, 250, 0.15); border: 1px solid rgba(167, 139, 250, 0.4); color: #c4b5fd; border-radius: 4px; cursor: pointer; display: none; transition: all 0.2s; white-space: nowrap;';",
    "tableBtn.style.cssText = 'margin-left: 8px; padding: 2px 6px; font-size: 0.65rem; background: var(--badge-custom-bg); border: 1px solid rgba(167, 139, 250, 0.4); color: var(--badge-custom-text); border-radius: 4px; cursor: pointer; display: none; transition: all 0.2s; white-space: nowrap;';"
)

# Note history error state
js = js.replace(
    'listEl.innerHTML = `<div style="text-align: center; color: #ef4444; font-size: 0.8rem; margin-top: 20px;">Error loading history</div>`;',
    'listEl.innerHTML = `<div style="text-align: center; color: var(--error); font-size: 0.8rem; margin-top: 20px;">Error loading history</div>`;'
)

# API tree error
js = js.replace(
    "apiTree.innerHTML = `<div style=\"padding: 1rem; color: #ef4444;\">无法加载完整的 API 列表，请刷新重试。<br><br><small style=\"color:var(--text-secondary);\">${e.stack || e.message || e}</small></div>`;",
    "apiTree.innerHTML = `<div style=\"padding: 1rem; color: var(--error);\">无法加载完整的 API 列表，请刷新重试。<br><br><small style=\"color:var(--text-secondary);\">${e.stack || e.message || e}</small></div>`;"
)

# Tip description box blue hardcoded colors
js = js.replace(
    "'<div style=\"margin-bottom: 12px; padding: 10px; background: rgba(56, 189, 248, 0.1); border-left: 3px solid #38bdf8; border-radius: 4px; color: #e1e4e8; font-size: 0.85rem;\"><strong style=\"color:#38bdf8;\">💡 提示 (Tip):</strong>",
    "'<div style=\"margin-bottom: 12px; padding: 10px; background: var(--badge-get-bg); border-left: 3px solid var(--badge-get-text); border-radius: 4px; color: var(--text-primary); font-size: 0.85rem;\"><strong style=\"color: var(--badge-get-text);\">💡 提示 (Tip):</strong>"
)

# Prerequisite warning box
js = js.replace(
    '<div style="color: #d29922; font-weight: bold; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">',
    '<div style="color: var(--accent-hover); font-weight: bold; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">'
)
js = js.replace(
    '<ul style="margin: 0; padding-left: 24px; color: #c9d1d9; font-size: 0.85rem; line-height: 1.5;">',
    '<ul style="margin: 0; padding-left: 24px; color: var(--text-primary); font-size: 0.85rem; line-height: 1.5;">'
)

# Pipeline log timestamp color
js = js.replace(
    '`<span style="color:#8b949e">[${timeStr}]</span>',
    '`<span style="color: var(--text-secondary)">[${timeStr}]</span>'
)

with open('D:/ZCM/Proj-PBI-API/static/script.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(js)

print("script.js updated.")
print("ALL DONE.")
