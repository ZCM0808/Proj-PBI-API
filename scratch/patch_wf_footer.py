import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix the structural bug where modal-footer is inside modal-body
buggy_structure = """                  </div>
  
                  </div>
                <div class="modal-footer" style="padding: 12px 1.5rem; border-top: 1px solid var(--overlay-10);">"""

fixed_structure = """                  </div>
  
                  </div>
              </div> <!-- Close modal-body here! -->
              <div class="modal-footer" style="padding: 12px 1.5rem; border-top: 1px solid var(--overlay-10); background: transparent;">"""

if buggy_structure in html:
    html = html.replace(buggy_structure, fixed_structure)
    # Also remove the extra </div> at the end since we moved it
    # Find the end of the modal-footer block
    end_of_footer = """                  </div>
              </div>
              </div>
          </div>
      </div>
      <!-- Settings Modal -->"""
    
    fixed_end_of_footer = """                  </div>
              </div>
          </div>
      </div>
      <!-- Settings Modal -->"""
      
    html = html.replace(end_of_footer, fixed_end_of_footer)


# Update version to avoid cache
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_A-Z]+', 'script.js?v=20260726_v27_footer_fix', html)
html = re.sub(r'style\.css\?v=\d+_[a-z0-9_A-Z]+', 'style.css?v=20260726_v27_footer_fix', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
    
print("Footer structural fix applied!")
