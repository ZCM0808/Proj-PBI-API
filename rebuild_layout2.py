import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# The current HTML has right-panel-category-container followed by request-actions
# Let's extract them precisely
cat_container_start = html.find('<div id="right-panel-category-container"')
input_group_start = html.find('<div class="input-group row">')

if cat_container_start != -1 and input_group_start != -1:
    cat_block = html[cat_container_start:input_group_start]
    
    # We want to extract request-actions from cat_block
    actions_start = cat_block.find('<div class="request-actions"')
    if actions_start != -1:
        # request-actions ends at the second to last </div> in cat_block
        actions_html = cat_block[actions_start:].strip()
        # It currently ends with </div>\n                </div>
        # So we trim the last </div>
        actions_html = actions_html.rsplit('</div>', 1)[0].strip() + '\n                    </div>'
        
        # We remove cat_block from html
        html = html.replace(cat_block, '')
        
        # Now we rebuild the builder-top
        builder_top_start = html.find('<div class="request-builder-top"')
        if builder_top_start != -1:
            builder_top_end = html.find('<!-- Env Identity -->', builder_top_start)
            if builder_top_end != -1:
                old_top = html[builder_top_start:builder_top_end]
                
                # Replace the closing </div> of the h2 container and the request-builder-top
                # with just the actions_html and the closing of the h2 container
                new_top = f"""<div class="request-builder-top" style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; margin: 0; display: flex; align-items: center;">
                        Request Configuration
                        <span id="request-mode-badge" style="font-size: 0.65rem; font-weight: normal; color: var(--accent); border: 1px solid rgba(62, 166, 255, 0.5); background: rgba(62, 166, 255, 0.1); padding: 2px 6px; border-radius: 12px; margin-left: 8px;">Free Mode</span>
                    </h2>
                    {actions_html}
                    </div>
"""
                html = html.replace(old_top, new_top)
                
                # Now we need to make sure we close request-builder-top AFTER context-toolbar
                ctx_end = html.find('</div>', html.find('<!-- Context Toolbar -->'))
                # wait, context-toolbar has nested divs
                ctx_start = html.find('<div id="context-toolbar"')
                
                def get_balanced_end(text, start_idx):
                    idx = start_idx
                    count = 0
                    while idx < len(text):
                        if text[idx:idx+4] == '<div':
                            count += 1
                            idx += 4
                        elif text[idx:idx+5] == '</div':
                            count -= 1
                            idx += 5
                            if count == 0:
                                return idx
                        else:
                            idx += 1
                    return -1
                
                real_ctx_end = get_balanced_end(html, ctx_start)
                
                # insert closing of request-builder-top AND the category container right after context-toolbar
                new_insertion = f"""
                </div> <!-- END request-builder-top -->

                <div id="right-panel-category-container" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; min-height: 24px;">
                    <div style="flex: 1;"><span id="right-panel-category-badge"></span></div>
                </div>

                """
                
                html = html[:real_ctx_end] + new_insertion + html[real_ctx_end:]
                
                # Update version
                html = html.replace('script.js?v=20260715_v18', 'script.js?v=20260715_v19')
                
                with open('static/index.html', 'w', encoding='utf-8') as f:
                    f.write(html)
                print("Success")
            else:
                print("Failed Env")
        else:
            print("Failed Top")
    else:
        print("Failed Actions")
else:
    print("Failed Cat")

