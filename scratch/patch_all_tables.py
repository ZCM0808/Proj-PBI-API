import re

# 1. Update index.html (drilldown table)
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target_html = """                <table data-table-id="drilldown" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                    <thead>
                        <tr>
                            <th onclick="window.sortTable(this, event, 0)" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;">Time (UTC+8)</th>
                            <th onclick="window.sortTable(this, event, 1)" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;">User ID</th>
                            <th onclick="window.sortTable(this, event, 2)" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;">Report Name</th>
                            <th onclick="window.sortTable(this, event, 3)" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;">Access Route</th>
                            <th onclick="window.sortTable(this, event, 4)" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;">Client IP</th>
                            <th onclick="window.sortTable(this, event, 5)" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;">Status</th>
                        </tr>
                    </thead>"""

replace_html = """                <table data-table-id="drilldown" class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                    <thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 5;">
                        <tr>
                            <th onclick="window.sortTable(this, event, 0)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Time (UTC+8)</th>
                            <th onclick="window.sortTable(this, event, 1)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">User ID</th>
                            <th onclick="window.sortTable(this, event, 2)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Report Name</th>
                            <th onclick="window.sortTable(this, event, 3)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Access Route</th>
                            <th onclick="window.sortTable(this, event, 4)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Client IP</th>
                            <th onclick="window.sortTable(this, event, 5)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Status</th>
                        </tr>
                    </thead>"""

if target_html in html:
    html = html.replace(target_html, replace_html)
    html = re.sub(r'v150', 'v151', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("index.html patched!")
else:
    print("Target not found in index.html!")


# 2. Update script.js (rvc table and perms table)
with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target_js_1 = """    <table data-table-id="rvc" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem; text-align: left;">
        <thead>
            <tr>
                <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Date</th>
                <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">View Count</th>
            </tr>
        </thead>"""

replace_js_1 = """    <table data-table-id="rvc" class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
        <thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 5;">
            <tr>
                <th onclick="window.sortTable(this, event, 0)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Date</th>
                <th onclick="window.sortTable(this, event, 1)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">View Count</th>
            </tr>
        </thead>"""

target_js_2 = """            <table data-table-id="perms" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem; text-align: left;">
                <thead>
                    <tr>
                        <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Feature Name</th>
                        <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">State</th>
                        <th onclick="window.sortTable(this, event, 2)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Extended State</th>
                    </tr>
                </thead>"""

replace_js_2 = """            <table data-table-id="perms" class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 5;">
                    <tr>
                        <th onclick="window.sortTable(this, event, 0)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Feature Name</th>
                        <th onclick="window.sortTable(this, event, 1)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">State</th>
                        <th onclick="window.sortTable(this, event, 2)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Extended State</th>
                    </tr>
                </thead>"""

if target_js_1 in js and target_js_2 in js:
    js = js.replace(target_js_1, replace_js_1)
    js = js.replace(target_js_2, replace_js_2)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("script.js patched!")
else:
    print("Target not found in script.js!")
