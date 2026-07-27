"""
Comprehensive patch for Bookmark Alias/Tags feature.
Modifies:
1. index.html - Add the right panel bookmark info & editor section.
2. script.js - Inject logic for rendering chips, editors, and saving metadata.
"""

import re

# ==============================================================================
# 1. Patch index.html
# ==============================================================================
with open('D:/ZCM/Proj-PBI-API/static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('\r\n', '\n')

right_panel_bm_html = """
                        <!-- Bookmark Section (Right Panel) -->
                        <div id="right-panel-bm-section" style="display: none;">
                            <button id="right-panel-bm-star" class="bookmark-btn">☆</button>
                            <div id="right-panel-bm-body">
                                <div id="right-panel-bm-meta"></div>
                                <div id="right-panel-bm-editor">
                                    <div class="bm-field-label">Alias</div>
                                    <input type="text" id="right-panel-bm-alias-input" placeholder="Give this API a short name...">
                                    <div class="bm-field-label">Tags</div>
                                    <div class="bm-tags-chips" id="right-panel-bm-tags-container">
                                        <input type="text" class="bm-tag-input-field" id="right-panel-bm-tag-input" placeholder="Add tag + Enter">
                                    </div>
                                    <div class="bm-editor-footer">
                                        <button class="btn-bm-cancel" id="right-panel-bm-cancel">Cancel</button>
                                        <button class="btn-bm-save" id="right-panel-bm-save">Save</button>
                                    </div>
                                </div>
                            </div>
                        </div>
"""
marker = '<div style="margin-top: 6px; margin-bottom: 8px;">'
if 'id="right-panel-bm-section"' not in html:
    html = html.replace(marker, right_panel_bm_html + '\n                        ' + marker, 1)

# Bump version
html = re.sub(r'style\.css\?v=[^"]+', 'style.css?v=20260723_v99', html)
html = re.sub(r'script\.js\?v=[^"]+', 'script.js?v=20260723_v99', html)

with open('D:/ZCM/Proj-PBI-API/static/index.html', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(html)


# ==============================================================================
# 2. Patch script.js
# ==============================================================================
with open('D:/ZCM/Proj-PBI-API/static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()
js = js.replace('\r\n', '\n')

# 2.1 Add getBookmarkMeta & updateBookmarkMeta after toggleBookmark
logic_injection = """
    function getBookmarkMeta(path, method) {
        const cleanPath = (path || '').replace("/v1.0/myorg", "");
        return getBookmarks().find(b => 
            (b.path || '').replace("/v1.0/myorg", "") === cleanPath && 
            (b.method || '').toUpperCase() === (method || '').toUpperCase()
        );
    }

    function updateBookmarkMeta(path, method, alias, userTags) {
        const bookmarks = getBookmarks();
        const cleanPath = (path || '').replace("/v1.0/myorg", "");
        const index = bookmarks.findIndex(b => 
            (b.path || '').replace("/v1.0/myorg", "") === cleanPath && 
            (b.method || '').toUpperCase() === (method || '').toUpperCase()
        );
        if (index >= 0) {
            bookmarks[index].alias = alias;
            bookmarks[index].userTags = userTags;
            localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));
            
            // Re-render to reflect changes
            const searchInput = document.getElementById('api-search-input');
            renderTree(searchInput ? searchInput.value : "");
            
            // If it is the currently active API, update the right panel too
            const uniqueId = (method || '').toUpperCase() + '_' + path;
            if (currentSelectedId === uniqueId) {
                renderRightPanelBookmarkState(bookmarks[index]);
            }
        }
    }

    // Right panel state management
    function renderRightPanelBookmarkState(ep) {
        const bmSection = document.getElementById('right-panel-bm-section');
        const starBtn = document.getElementById('right-panel-bm-star');
        const metaContainer = document.getElementById('right-panel-bm-meta');
        
        if (!bmSection) return;
        
        const bmData = getBookmarkMeta(ep.path, ep.method);
        const isBookmarked = !!bmData;
        
        bmSection.style.display = 'flex';
        
        starBtn.className = isBookmarked ? 'bookmark-btn active' : 'bookmark-btn';
        starBtn.innerHTML = isBookmarked ? '★' : '☆';
        starBtn.title = isBookmarked ? "取消收藏" : "加入收藏";
        
        starBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(ep, e);
            renderRightPanelBookmarkState(ep); // Refresh right panel
        };
        
        if (isBookmarked) {
            let metaHtml = '';
            const alias = bmData.alias || '';
            const tags = bmData.userTags || [];
            
            if (alias) {
                metaHtml += `<span class="bm-alias" title="Alias">${alias}</span>`;
            }
            tags.forEach(t => {
                metaHtml += `<span class="bm-tag">${t}</span>`;
            });
            
            metaHtml += `<button id="right-panel-bm-edit-btn" title="Edit alias & tags">✏️ Edit</button>`;
            metaContainer.innerHTML = metaHtml;
            
            document.getElementById('right-panel-bm-edit-btn').onclick = () => {
                openRightPanelEditor(bmData);
            };
        } else {
            metaContainer.innerHTML = `<span style="font-size:0.7rem; color:var(--text-secondary); margin-left: 4px;">Not bookmarked</span>`;
            document.getElementById('right-panel-bm-editor').classList.remove('open');
        }
    }
    
    function openRightPanelEditor(bmData) {
        const editor = document.getElementById('right-panel-bm-editor');
        const aliasInput = document.getElementById('right-panel-bm-alias-input');
        const tagsContainer = document.getElementById('right-panel-bm-tags-container');
        const tagInput = document.getElementById('right-panel-bm-tag-input');
        
        editor.classList.add('open');
        aliasInput.value = bmData.alias || '';
        
        let tags = [...(bmData.userTags || [])];
        
        function renderTags() {
            tagsContainer.innerHTML = '';
            tags.forEach((t, i) => {
                const chip = document.createElement('div');
                chip.className = 'bm-tag-chip';
                chip.innerHTML = `<span>${t}</span><button class="chip-remove" type="button" data-index="${i}">&times;</button>`;
                tagsContainer.appendChild(chip);
            });
            tagsContainer.appendChild(tagInput);
            
            tagsContainer.querySelectorAll('.chip-remove').forEach(btn => {
                btn.onclick = (e) => {
                    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                    tags.splice(idx, 1);
                    renderTags();
                };
            });
        }
        
        renderTags();
        
        tagInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = tagInput.value.trim();
                if (val && !tags.includes(val)) {
                    tags.push(val);
                    tagInput.value = '';
                    renderTags();
                }
            } else if (e.key === 'Backspace' && tagInput.value === '' && tags.length > 0) {
                tags.pop();
                renderTags();
            }
        };
        
        document.getElementById('right-panel-bm-cancel').onclick = () => {
            editor.classList.remove('open');
        };
        
        document.getElementById('right-panel-bm-save').onclick = () => {
            if (tagInput.value.trim()) {
                if (!tags.includes(tagInput.value.trim())) tags.push(tagInput.value.trim());
            }
            updateBookmarkMeta(bmData.path, bmData.method, aliasInput.value.trim(), tags);
            editor.classList.remove('open');
        };
    }
"""
if 'function getBookmarkMeta' not in js:
    # Insert right after toggleBookmark closing brace
    # toggleBookmark ends around line 1185
    old_target = "    // 渲染 API 树\n    function renderTree(searchTerm = \"\") {"
    js = js.replace(old_target, logic_injection + "\n" + old_target, 1)

# 2.2 Modify renderTree to render meta row
# Find where nameEl.innerHTML is set (around 1389-1400)
# We will inject a div for the meta row and an edit button in the primary row
old_name_el = """                nameEl.innerHTML = `
                    <div style="display:flex; align-items:center; margin-bottom: 4px;">
                        <strong style="color:var(--text-primary); font-weight: 600; font-size: 0.85rem;">${primaryName}</strong>
                        ${categoryBadgeHtml}
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-bottom: 2px; line-height: 1.3;">
                        <span style="opacity: 0.6; margin-right: 4px; font-weight: bold;">EN:</span>${englishDesc}
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); line-height: 1.3;">
                        <span style="opacity: 0.6; margin-right: 4px; font-weight: bold;">ZH:</span>${chineseDesc}
                    </div>
                `;"""

new_name_el = """
                const bmData = getBookmarkMeta(ep.path, ep.method);
                const isBookmarked = !!bmData;
                let metaHtml = '';
                let editBtnHtml = '';
                
                if (isBookmarked) {
                    const alias = bmData.alias || '';
                    const tags = bmData.userTags || [];
                    if (alias) metaHtml += `<span class="bm-alias">${alias}</span>`;
                    tags.forEach(t => metaHtml += `<span class="bm-tag">${t}</span>`);
                    editBtnHtml = `<button class="bm-edit-btn" title="Edit alias & tags">✏️</button>`;
                }
                
                const metaRowClass = metaHtml ? 'bm-meta-row has-content' : 'bm-meta-row empty';

                nameEl.innerHTML = `
                    <div style="display:flex; align-items:center; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
                        <strong style="color:var(--text-primary); font-weight: 600; font-size: 0.85rem;">${primaryName}</strong>
                        ${categoryBadgeHtml}
                        ${editBtnHtml}
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-bottom: 2px; line-height: 1.3;">
                        <span style="opacity: 0.6; margin-right: 4px; font-weight: bold;">EN:</span>${englishDesc}
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); line-height: 1.3;">
                        <span style="opacity: 0.6; margin-right: 4px; font-weight: bold;">ZH:</span>${chineseDesc}
                    </div>
                    <div class="${metaRowClass}">${metaHtml}</div>
                    <div class="bm-editor-panel" style="display:none;"></div>
                `;
"""
if "const bmData = getBookmarkMeta(ep.path, ep.method);" not in js:
    js = js.replace(old_name_el, new_name_el, 1)

# We need to bind the edit button event. Right after nameEl is appended to itemEl
old_append_logic = """
                itemEl.appendChild(badge);
                itemEl.appendChild(nameEl);
                itemEl.appendChild(insertNoteBtn);
                itemEl.appendChild(starBtn);
"""

new_append_logic = """
                itemEl.appendChild(badge);
                itemEl.appendChild(nameEl);
                itemEl.appendChild(insertNoteBtn);
                itemEl.appendChild(starBtn);
                
                // Bind edit button
                const editBtn = nameEl.querySelector('.bm-edit-btn');
                if (editBtn) {
                    editBtn.onclick = (e) => {
                        e.stopPropagation(); // prevent selecting the item
                        const editorPanel = nameEl.querySelector('.bm-editor-panel');
                        if (editorPanel.style.display === 'flex') {
                            editorPanel.style.display = 'none';
                            return;
                        }
                        
                        document.querySelectorAll('.bm-editor-panel').forEach(p => p.style.display = 'none');
                        editorPanel.style.display = 'flex';
                        
                        let currentTags = [...(bmData.userTags || [])];
                        editorPanel.innerHTML = `
                            <div class="bm-field-label">Alias</div>
                            <input type="text" class="bm-alias-input" value="${bmData.alias || ''}" placeholder="Give this API a short name...">
                            <div class="bm-field-label">Tags</div>
                            <div class="bm-tags-chips">
                                <input type="text" class="bm-tag-input-field" placeholder="Add tag + Enter">
                            </div>
                            <div class="bm-editor-footer">
                                <button class="btn-bm-cancel">Cancel</button>
                                <button class="btn-bm-save">Save</button>
                            </div>
                        `;
                        
                        const tagsChipsContainer = editorPanel.querySelector('.bm-tags-chips');
                        const tagInput = editorPanel.querySelector('.bm-tag-input-field');
                        
                        function renderLocalTags() {
                            tagsChipsContainer.innerHTML = '';
                            currentTags.forEach((t, i) => {
                                const chip = document.createElement('div');
                                chip.className = 'bm-tag-chip';
                                chip.innerHTML = `<span>${t}</span><button class="chip-remove" type="button" data-index="${i}">&times;</button>`;
                                tagsChipsContainer.appendChild(chip);
                            });
                            tagsChipsContainer.appendChild(tagInput);
                            
                            tagsChipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
                                btn.onclick = (ev) => {
                                    ev.stopPropagation();
                                    const idx = parseInt(ev.currentTarget.getAttribute('data-index'));
                                    currentTags.splice(idx, 1);
                                    renderLocalTags();
                                };
                            });
                        }
                        renderLocalTags();
                        
                        tagInput.onkeydown = (ev) => {
                            if (ev.key === 'Enter') {
                                ev.preventDefault();
                                ev.stopPropagation();
                                const val = tagInput.value.trim();
                                if (val && !currentTags.includes(val)) {
                                    currentTags.push(val);
                                    tagInput.value = '';
                                    renderLocalTags();
                                }
                            } else if (ev.key === 'Backspace' && tagInput.value === '' && currentTags.length > 0) {
                                currentTags.pop();
                                renderLocalTags();
                            }
                        };
                        tagInput.onclick = (ev) => ev.stopPropagation();
                        
                        const aliasInput = editorPanel.querySelector('.bm-alias-input');
                        aliasInput.onclick = (ev) => ev.stopPropagation();
                        aliasInput.onkeydown = (ev) => ev.stopPropagation(); // prevent tree selection interference
                        
                        editorPanel.querySelector('.btn-bm-cancel').onclick = (ev) => {
                            ev.stopPropagation();
                            editorPanel.style.display = 'none';
                        };
                        
                        editorPanel.querySelector('.btn-bm-save').onclick = (ev) => {
                            ev.stopPropagation();
                            if (tagInput.value.trim()) {
                                if (!currentTags.includes(tagInput.value.trim())) currentTags.push(tagInput.value.trim());
                            }
                            updateBookmarkMeta(bmData.path, bmData.method, aliasInput.value.trim(), currentTags);
                        };
                    };
                }
"""

if "// Bind edit button" not in js:
    js = js.replace(old_append_logic, new_append_logic, 1)


# 2.3 Modify Right panel trigger on click
# Inside itemEl.addEventListener('click', ...
# After selectedApiZh.textContent = zhTranslated;

old_zh_logic = "                    selectedApiZh.textContent = zhTranslated;"
new_zh_logic = """                    selectedApiZh.textContent = zhTranslated;
                    
                    // Render Bookmark Meta in Right Panel
                    if (typeof renderRightPanelBookmarkState === 'function') {
                        renderRightPanelBookmarkState(ep);
                    }
"""
if "renderRightPanelBookmarkState(ep)" not in js:
    js = js.replace(old_zh_logic, new_zh_logic, 1)

with open('D:/ZCM/Proj-PBI-API/static/script.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(js)

print("JS done.")
