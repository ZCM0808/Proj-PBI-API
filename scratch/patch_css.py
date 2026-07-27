import re

with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# We will append global select styling to the bottom of the file
global_select_css = """
/* =========================================
   Global Select (Dropdown) Dark Mode Optimizations
   ========================================= */
select {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a78bfa%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 10px auto;
    padding-right: 32px !important;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
}

select:hover {
    border-color: var(--accent);
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.1);
}

select option {
    background-color: var(--bg-color);
    color: var(--text-primary);
    padding: 8px;
}
"""

if "Global Select (Dropdown) Dark Mode Optimizations" not in css:
    css += global_select_css

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

# Update index.html version tag to invalidate css cache
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'style\.css\?v=[0-9_a-zA-Z]+', 'style.css?v=20260726_v37_select_ui', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
