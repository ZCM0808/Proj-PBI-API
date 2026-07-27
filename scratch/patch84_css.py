"""
Patch: Add alias + userTags editing to bookmarks
- Left panel: show alias/tags chips on bookmark items, with an edit button (pencil)
- Right panel: show bookmark star toggle + alias/tags editor inline
- Full CSS animations, mobile-compatible
"""


# ─── 1. CSS ───────────────────────────────────────────────────────────────────
new_css = """
/* =====================================================================
   Bookmark Alias & Tags System
   ===================================================================== */

/* Meta row in bookmark list item */
.bm-meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-top: 5px;
    min-height: 0;
    overflow: hidden;
    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.3s ease,
                margin-top 0.3s ease;
}
.bm-meta-row.has-content {
    max-height: 100px;
    opacity: 1;
    margin-top: 5px;
}
.bm-meta-row.empty {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
}

/* Alias label */
.bm-alias {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-glow);
    border: 1px solid rgba(242, 200, 17, 0.25);
    border-radius: 4px;
    padding: 1px 7px;
    letter-spacing: 0.3px;
    white-space: nowrap;
    animation: chipPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* User tag chips */
.bm-tag {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--badge-custom-text);
    background: var(--badge-custom-bg);
    border: 1px solid rgba(167, 139, 250, 0.3);
    border-radius: 20px;
    padding: 1px 8px;
    white-space: nowrap;
    cursor: default;
    animation: chipPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition: all 0.2s;
}
.bm-tag:hover {
    background: rgba(167, 139, 250, 0.28);
    border-color: var(--badge-custom-text);
}

@keyframes chipPop {
    from { transform: scale(0.6); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
}

/* Edit bookmark meta button */
.bm-edit-btn {
    font-size: 0.7rem;
    background: none;
    border: 1px dashed var(--panel-border);
    color: var(--text-secondary);
    border-radius: 4px;
    padding: 1px 5px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s, background 0.2s, border-color 0.2s, color 0.2s;
    flex-shrink: 0;
    line-height: 1.4;
}
.api-item:hover .bm-edit-btn,
.bm-edit-btn:focus {
    opacity: 1;
}
.bm-edit-btn:hover {
    background: var(--overlay-8);
    border-color: var(--accent);
    color: var(--accent);
}

/* Inline bookmark editor panel */
.bm-editor-panel {
    margin-top: 8px;
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
    animation: editorSlideIn 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes editorSlideIn {
    from { opacity: 0; transform: translateY(-8px) scaleY(0.92); }
    to   { opacity: 1; transform: translateY(0)    scaleY(1); }
}

.bm-editor-panel .bm-field-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 2px;
}

.bm-editor-panel input[type="text"] {
    width: 100%;
    background: var(--overlay-5);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.8rem;
    padding: 5px 9px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
}
.bm-editor-panel input[type="text"]:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-glow);
}

/* Tags chip editor */
.bm-tags-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 4px 6px;
    background: var(--overlay-5);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    min-height: 32px;
    cursor: text;
    transition: border-color 0.2s;
}
.bm-tags-chips:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-glow);
}
.bm-tags-chips .bm-tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.68rem;
    color: var(--badge-custom-text);
    background: var(--badge-custom-bg);
    border: 1px solid rgba(167, 139, 250, 0.3);
    border-radius: 20px;
    padding: 2px 7px 2px 9px;
    animation: chipPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bm-tag-chip .chip-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--badge-custom-text);
    font-size: 0.8rem;
    line-height: 1;
    padding: 0;
    opacity: 0.7;
    transition: opacity 0.15s, transform 0.15s;
}
.bm-tag-chip .chip-remove:hover {
    opacity: 1;
    transform: scale(1.3);
}
.bm-tag-input-field {
    border: none !important;
    outline: none !important;
    background: transparent !important;
    min-width: 80px;
    flex: 1;
    padding: 2px 4px !important;
    font-size: 0.78rem !important;
    color: var(--text-primary) !important;
    box-shadow: none !important;
}

/* Editor footer buttons */
.bm-editor-footer {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 2px;
}
.bm-editor-footer .btn-bm-cancel {
    font-size: 0.75rem;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--panel-border);
    background: var(--overlay-5);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
}
.bm-editor-footer .btn-bm-cancel:hover {
    border-color: var(--overlay-30);
    color: var(--text-primary);
}
.bm-editor-footer .btn-bm-save {
    font-size: 0.75rem;
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}
.bm-editor-footer .btn-bm-save:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    box-shadow: 0 2px 8px var(--accent-glow);
}

/* ── Right panel bookmark info section ── */
#right-panel-bm-section {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    background: var(--overlay-5);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    margin-bottom: 10px;
    transition: all 0.3s ease;
    animation: fadeInUp 0.25s ease;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}

#right-panel-bm-star {
    font-size: 1.3rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s;
    line-height: 1;
    margin-top: 1px;
    user-select: none;
    background: none;
    border: none;
    padding: 0;
    color: var(--text-secondary);
}
#right-panel-bm-star.active {
    color: var(--accent);
    text-shadow: 0 0 12px var(--accent-glow);
}
#right-panel-bm-star:hover {
    transform: scale(1.25) rotate(-10deg);
}

#right-panel-bm-body {
    flex: 1;
    min-width: 0;
}

#right-panel-bm-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 5px;
}

#right-panel-bm-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-bottom: 6px;
    min-height: 20px;
}

#right-panel-bm-edit-btn {
    font-size: 0.7rem;
    background: none;
    border: 1px dashed var(--panel-border);
    color: var(--text-secondary);
    border-radius: 4px;
    padding: 2px 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
#right-panel-bm-edit-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-glow);
}

#right-panel-bm-editor {
    margin-top: 8px;
    display: none;
    flex-direction: column;
    gap: 8px;
    animation: editorSlideIn 0.2s ease;
}
#right-panel-bm-editor.open {
    display: flex;
}

/* Mobile responsive */
@media (max-width: 640px) {
    .bm-editor-panel {
        padding: 8px;
    }
    .bm-editor-panel input[type="text"],
    .bm-tags-chips {
        font-size: 16px; /* prevent iOS zoom */
    }
    #right-panel-bm-section {
        flex-direction: column;
        gap: 6px;
    }
}
"""

with open('D:/ZCM/Proj-PBI-API/static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace('\r\n', '\n')

marker = '\n/* Custom dialog modal (alert/confirm) */'
css = css.replace(marker, new_css + marker, 1)

with open('D:/ZCM/Proj-PBI-API/static/style.css', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(css)

print("CSS done.")
