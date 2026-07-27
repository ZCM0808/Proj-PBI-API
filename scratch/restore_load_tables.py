import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

new_func = """
window.loadDatasetTables = async function(btn) {
    const origHtml = btn.innerHTML;
    btn.innerHTML = '⏳...';
    btn.disabled = true;
    
    try {
        const ws = document.getElementById('wf-ds-workspace').value;
        const ds = document.getElementById('wf-ds-dataset').value;
        if(!ws || !ds) {
            btn.innerHTML = '❌ Select WS/DS';
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
            return;
        }
        
        const payload = {
            query: "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])"
        };
        
        const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            const sel = document.getElementById('wf-ds-table');
            sel.innerHTML = '';
            data.results.forEach(t => {
                const NameKey = Object.keys(t).find(k => k.includes('Table Name]') || k === 'Table Name' || k.endsWith('Name]'));
                const val = t[NameKey];
                if (val && !val.startsWith('RowNumber-')) {
                    const opt = document.createElement('option');
                    opt.value = val;
                    opt.textContent = val;
                    sel.appendChild(opt);
                }
            });
            btn.innerHTML = '✅ Loaded!';
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
        } else {
            btn.innerHTML = '❌ Error';
            alert(data.message);
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
        }
    } catch (e) {
        btn.innerHTML = '❌ Net Err';
        setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
    }
};
"""

js += new_func

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

