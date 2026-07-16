import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Extract request-actions
actions_regex = r'(<div class="request-actions".*?</div>\s*</div>\s*</div>\s*</div>)'
match = re.search(actions_regex, html, flags=re.DOTALL)
if match:
    actions_html = match.group(1)
    # Remove it from its current position
    html = html.replace(actions_html, '')
else:
    print("Could not find request-actions")
    exit(1)

# 2. Extract right-panel-category-container
category_regex = r'(<div id="right-panel-category-container".*?</div>\s*</div>)'
cat_match = re.search(category_regex, html, flags=re.DOTALL)
if cat_match:
    cat_html = cat_match.group(1)
    # Remove it
    html = html.replace(cat_html, '')
else:
    print("Could not find category container")
    exit(1)

# 3. Find the Request Configuration h2 area
h2_regex = r'(<h2.*?>\s*Request Configuration\s*<span id="request-mode-badge".*?>.*?</span>\s*</h2>\s*</div>\s*)</div>'
h2_match = re.search(h2_regex, html, flags=re.DOTALL)
if h2_match:
    # We want to replace the closing </div> of the h2 container with the actions_html and then close it
    # Wait, the h2 is inside a flex row:
    # <div style="display: flex; justify-content: space-between; align-items: center;">
    #   <h2>...</h2>
    # </div>
    # We want to insert actions_html right after the <h2> and before the </div>
    
    # Actually, let's just find the exact string to replace
    exact_h2_str = h2_match.group(1) # This is the h2 and its container's closing </div>
    # Wait, the regex captured the </div> of the h2's container AND the </div> of request-builder-top
    # Let's be more precise
    
    # We want to find:
    # <h2 style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; margin: 0; display: flex; align-items: center;">
    #     Request Configuration
    #     <span id="request-mode-badge" style="font-size: 0.65rem; font-weight: normal; color: var(--accent); border: 1px solid rgba(62, 166, 255, 0.5); background: rgba(62, 166, 255, 0.1); padding: 2px 6px; border-radius: 12px; margin-left: 8px;">Free Mode</span>
    # </h2>
    # </div>
    # </div>
    
    # Let's replace the </div>\n                </div> with just </div>, then insert actions, then close the container
    pass

# A cleaner way: rebuild the whole block from <div class="request-builder-top"> to the input-group row
builder_top_start = html.find('<div class="request-builder-top"')
input_group_start = html.find('<div class="input-group row">')

if builder_top_start != -1 and input_group_start != -1:
    old_block = html[builder_top_start:input_group_start]
    
    # What's in old_block?
    # It has request-builder-top, env-identity, context-toolbar.
    # We already removed request-actions and right-panel-category-container from html.
    # Wait, if we removed them from html, old_block in the updated html will not have them.
    
    # Let's just reconstruct the block cleanly.
    
    # We need to find env-identity and context-toolbar
    env_match = re.search(r'(<!-- Env Identity -->.*?</div>)', old_block, flags=re.DOTALL)
    ctx_match = re.search(r'(<!-- Context Toolbar -->.*?</div>\s*</div>\s*</div>\s*</div>)', old_block, flags=re.DOTALL)
    
    if env_match and ctx_match:
        env_html = env_match.group(1)
        ctx_html = ctx_match.group(1)
        
        new_block = f"""<div class="request-builder-top" style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; margin: 0; display: flex; align-items: center;">
                        Request Configuration
                        <span id="request-mode-badge" style="font-size: 0.65rem; font-weight: normal; color: var(--accent); border: 1px solid rgba(62, 166, 255, 0.5); background: rgba(62, 166, 255, 0.1); padding: 2px 6px; border-radius: 12px; margin-left: 8px;">Free Mode</span>
                    </h2>
                    {actions_html}
                    </div>

                    {env_html}

                    {ctx_html}
                </div>

                <div id="right-panel-category-container" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; min-height: 24px;">
                    <div style="flex: 1;"><span id="right-panel-category-badge"></span></div>
                </div>

                """
        
        html = html[:builder_top_start] + new_block + html[input_group_start:]
        
        with open('static/index.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Success")
    else:
        print("Failed to find env or ctx")
else:
    print("Failed to find builder top or input group")

