import os
import re

INDEX_FILE = 'static/index.html'

with open(INDEX_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix the broken HTML.
# The broken part looks like:
# <div id="wf-rvc-status" style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Ready. Select date range (max 30 days recommended).</div>
#                                         </tbody>
#                                     </table>
#                                 </div>
# </div>

pattern = re.compile(r'<div id="wf-rvc-status".*?</div>\s*</tbody>\s*</table>\s*</div>\s*</div>', re.DOTALL)

replacement = """<div id="wf-rvc-status" style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Ready. Select date range (max 30 days recommended).</div>
                                <!-- JSON Section -->
                                <div style="position: relative; margin-bottom: 12px; display: none;" id="wf-rvc-json-container">
                                    <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Raw JSON Response</div>
                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-rvc-json').textContent)" title="Copy JSON" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                    <div id="wf-out-rvc-json" class="wf-console" style="min-height: 100px; padding-bottom: 20px;">Waiting...</div>
                                </div>
                                
                                <!-- Table Section -->
                                <div style="position: relative; display: none;" id="wf-rvc-table-container">
                                    <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Parsed Activity Events Table</div>
                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-rvc-table').innerText)" title="Copy Table Text" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                    <div id="wf-out-rvc-table" class="wf-console" style="min-height: 150px; padding-bottom: 60px;">Waiting...</div>
                                </div>
                            </div>"""

html = pattern.sub(replacement, html)

with open(INDEX_FILE, 'w', encoding='utf-8') as f:
    f.write(html)
print("Index HTML Fixed!")
