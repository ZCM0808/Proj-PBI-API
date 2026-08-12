import os

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove redundant Run Analysis
html = html.replace(
    '<button class="btn-wf-sm" id="btn-run-rvc" style="margin-left: auto;" onclick="window.runRvcWorkflow()">Run Analysis</button>',
    '<!-- removed redundant Run Analysis -->'
)

# 2. Remove redundant Run Check
html = html.replace(
    '<button class="btn-wf-sm" id="btn-run-check-perms" style="margin-left: auto;" onclick="window.runCheckPermsWorkflow()">Run Check</button>',
    '<!-- removed redundant Run Check -->'
)

# 3. Remove redundant Run Scan
html = html.replace(
    '<button class="btn-wf-sm" id="btn-run-gum" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>',
    '<!-- removed redundant Run Scan -->'
)

# 4. Standardize + Add User
html = html.replace(
    '<button class="btn-action-primary" style="height: 34px; padding: 0 16px;" onclick="if(window.openGumAddUserModal) window.openGumAddUserModal()">+ Add User</button>',
    '<button class="btn-wf-md btn-wf-secondary" onclick="if(window.openGumAddUserModal) window.openGumAddUserModal()">+ Add User</button>'
)

# 5. Standardize Global Permissions Table Results
html = html.replace(
    '<button type="button" onclick="window.openGumResultModal()" style="background:none;border:none;padding:0;color:var(--accent);font-size:0.78rem;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:5px;text-decoration:underline dotted;" title="Click to expand results in a large resizable panel">',
    '<button type="button" class="btn-wf-sm btn-wf-secondary" onclick="window.openGumResultModal()" title="Click to expand results in a large resizable panel">'
)

# 6. Rename Run Full Workflow text
html = html.replace(
    'Run Full Workflow\n                </button>',
    '▶ Run Selected Workflow\n                </button>'
)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML updated.")
