import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Cache busting
content = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v8_agent', content)
# Or if it doesn't have the suffix
content = re.sub(r'script\.js\?v=\d+_v\d+', 'script.js?v=20260725_v8_agent', content)

# Also ensure we actually have the ai-chat-header
header_pattern = r'(<div class="modal-header"[^>]*id="ai-chat-header">.*?<h3[^>]*>.*?</h3>)'
replacement = r'\1\n            <div style="display: flex; align-items: center; gap: 12px;">\n                <button type="button" id="ai-auto-approve-btn" title="审批模式 (点击开启免审)" style="background: transparent; border: 1px solid var(--panel-border); border-radius: 6px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.75rem; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onmouseover="this.style.background=\'var(--overlay-10)\'" onmouseout="this.style.background=\'transparent\'" onclick="toggleAutoApprove()">\n                    <span id="auto-approve-icon">🔒</span>\n                    <span id="auto-approve-text">审批模式</span>\n                </button>\n                <button type="button" class="close-btn" onclick="toggleAIChat()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>\n            </div>'

if 'id="ai-auto-approve-btn"' not in content:
    content = re.sub(r'(<div class="modal-header"[^>]*id="ai-chat-header">.*?<h3[^>]*>.*?</h3>)\s*<button type="button" class="close-btn".*?</button>', replacement, content, flags=re.DOTALL)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("index.html updated successfully!")
