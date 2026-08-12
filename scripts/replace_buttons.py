import os

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace(
    '<button id="start-pipeline-btn" class="btn-pipeline">🚀 启动自动化流水线 (Start DataOps)</button>',
    '<!-- removed redundant start-pipeline-btn -->'
)

html = html.replace(
    '<button class="btn-action-primary" id="btn-run-rvc" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="window.runRvcWorkflow()">Run Analysis</button>',
    '<button class="btn-wf-sm" id="btn-run-rvc" style="margin-left: auto;" onclick="window.runRvcWorkflow()">Run Analysis</button>'
)

html = html.replace(
    '<button class="btn-action-primary" id="btn-run-check-perms" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="window.runCheckPermsWorkflow()">Run Check</button>',
    '<button class="btn-wf-sm" id="btn-run-check-perms" style="margin-left: auto;" onclick="window.runCheckPermsWorkflow()">Run Check</button>'
)

html = html.replace(
    '<button class="btn-action-primary" id="btn-run-gum" style="padding: 4px 12px; font-size: 0.75rem; height: 24px;" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>',
    '<button class="btn-wf-sm" id="btn-run-gum" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>'
)

html = html.replace(
    '<button id="wf-ds-btn-step1" class="btn-action-secondary wf-step-btn" onclick="window.loadDatasetTablesStep1(this)">Run Step 1</button>',
    '<button id="wf-ds-btn-step1" class="btn-wf-sm btn-wf-secondary wf-step-btn" onclick="window.loadDatasetTablesStep1(this)">Run Step 1</button>'
)

html = html.replace(
    '<button id="wf-ds-btn-step2" class="btn-action-secondary wf-step-btn" style="white-space: nowrap;" onclick="window.executeDatasetStep2(this)">Run Step 2</button>',
    '<button id="wf-ds-btn-step2" class="btn-wf-sm btn-wf-secondary wf-step-btn" style="white-space: nowrap;" onclick="window.executeDatasetStep2(this)">Run Step 2</button>'
)

html = html.replace(
    '<button id="wf-btn-step1" class="btn-action-secondary wf-step-btn">Run Step 1</button>',
    '<button id="wf-btn-step1" class="btn-wf-sm btn-wf-secondary wf-step-btn">Run Step 1</button>'
)

html = html.replace(
    '<button id="wf-btn-step2" class="btn-action-secondary wf-step-btn" disabled>Run Step 2</button>',
    '<button id="wf-btn-step2" class="btn-wf-sm btn-wf-secondary wf-step-btn" disabled>Run Step 2</button>'
)

html = html.replace(
    '<button id="wf-btn-step3" class="btn-action-secondary wf-step-btn" disabled>Run Step 3</button>',
    '<button id="wf-btn-step3" class="btn-wf-sm btn-wf-secondary wf-step-btn" disabled>Run Step 3</button>'
)

html = html.replace(
    '<button id="wf-btn-runall" class="btn-action-primary" style="padding: 8px 16px; font-weight: bold; display: flex; align-items: center; gap: 6px; line-height: 1; margin: 0;">',
    '<button id="wf-btn-runall" class="btn-wf-lg">'
)

html = html.replace(
    '<button id="start-pipeline-btn" class="btn-pipeline" style="padding: 8px 16px;">🚀 启动流水线 (Start DataOps)</button>',
    '<button id="start-pipeline-btn" class="btn-wf-md">🚀 启动流水线 (Start DataOps)</button>'
)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done replacing buttons.")
