import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace executeDatasetStep2 up to executeExportDataset
old_code_regex = re.compile(r'window\.executeDatasetStep2 = async function\(btn\) \{.*?\};\n\nwindow\.executeExportDataset = async function\(\) \{.*?\};', re.DOTALL)

new_code = """window.executeDatasetStep2 = async function(btn) {
    if (btn) btn.disabled = true;
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const selectedTables = window.selectedDsTables || [];
    const exportFormat = document.getElementById('wf-ds-export-format').value;
    const consoleOut = document.getElementById('wf-out-ds-step2');
    const step2Div = document.getElementById('wf-ds-step-2');
    
    if(!ws || !ds || selectedTables.length === 0) {
        consoleOut.innerText = '❌ Error: Please ensure Step 1 is complete and at least one Table is selected.';
        if (btn) btn.disabled = false;
        return false;
    }
    
    step2Div.classList.add('active');
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    
    consoleOut.innerText = `⏳ Starting export of ${selectedTables.length} table(s) as ${exportFormat}...`;
    
    let zip = null;
    let wb = null;
    if (exportFormat === 'CSV') {
        zip = new JSZip();
    } else {
        wb = XLSX.utils.book_new();
    }
    
    let successCount = 0;
    
    for (let i = 0; i < selectedTables.length; i++) {
        const tb = selectedTables[i];
        consoleOut.innerText += `\\n\\n[${i+1}/${selectedTables.length}] ⏳ Fetching table: '${tb}'...`;
        
        const query = `EVALUATE '${tb}'`;
        const payload = { pbi_client_id: clientId, pbi_client_secret: clientSecret, pbi_tenant_id: tenantId, query: query };
        
        try {
            const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            
            if(data.success) {
                const rows = data.results;
                consoleOut.innerText += `\\n✓ Status: 200 OK. Retrieved ${rows.length} rows.`;
                
                if(!rows || rows.length === 0) {
                    consoleOut.innerText += '\\n⚠️ Table is empty. Skipping...';
                    continue;
                }
                
                const cleanKey = (k) => {
                    const match = k.match(/\\[(.*?)\\]/);
                    return match ? match[1] : k;
                };
                
                if (exportFormat === 'CSV') {
                    const rawKeys = Object.keys(rows[0]);
                    let csv = rawKeys.map(k => `"${cleanKey(k).replace(/"/g, '""')}"`).join(",") + "\\n";
                    rows.forEach(r => {
                        csv += rawKeys.map(k => {
                            let val = r[k];
                            if (val === null || val === undefined) val = '';
                            return `"${String(val).replace(/"/g, '""')}"`;
                        }).join(",") + "\\n";
                    });
                    const csvData = new Uint8Array([0xEF, 0xBB, 0xBF, ...new TextEncoder().encode(csv)]);
                    zip.file(`${tb.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`, csvData);
                    successCount++;
                } else {
                    const cleanRows = rows.map(r => {
                        let newObj = {};
                        Object.keys(r).forEach(k => {
                            newObj[cleanKey(k)] = r[k];
                        });
                        return newObj;
                    });
                    const wsSheet = XLSX.utils.json_to_sheet(cleanRows);
                    let safeName = tb.replace(/[\\\\\\/\\?\\*\\[\\]\\:]/g, '_').substring(0, 31);
                    if (wb.SheetNames.includes(safeName)) {
                        safeName = safeName.substring(0, 27) + '_' + i;
                    }
                    XLSX.utils.book_append_sheet(wb, wsSheet, safeName);
                    successCount++;
                }
                
            } else {
                consoleOut.innerText += `\\n❌ Query Failed: ${data.message}`;
            }
        } catch(err) {
            consoleOut.innerText += `\\n❌ Network Error: ${err.message}`;
        }
    }
    
    if (successCount > 0) {
        consoleOut.innerText += `\\n\\n⏳ Generating final ${exportFormat} file...`;
        if (exportFormat === 'CSV') {
            zip.generateAsync({type:"blob"}).then(function(content) {
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Export_Tables_${ds}.zip`;
                a.click();
                URL.revokeObjectURL(url);
                consoleOut.innerText += `\\n✓ Download initiated: ${a.download}`;
                if (btn) btn.disabled = false;
            });
            return true; // async generation
        } else {
            XLSX.writeFile(wb, `Export_Tables_${ds}.xlsx`);
            consoleOut.innerText += `\\n✓ Download initiated: Export_Tables_${ds}.xlsx`;
        }
    } else {
        consoleOut.innerText += '\\n\\n⚠️ No data was exported.';
    }
    
    if (btn) btn.disabled = false;
    return (successCount > 0);
};

window.executeExportDataset = async function() {
    const step1Btn = document.getElementById('wf-ds-btn-step1');
    const step2Btn = document.getElementById('wf-ds-btn-step2');
    
    if (!window.selectedDsTables || window.selectedDsTables.length === 0) {
        const step1Ok = await window.loadDatasetTablesStep1(step1Btn);
        if (!step1Ok) return;
        
        // Auto-select all tables
        const selectAllCb = document.getElementById('wf-ds-table-select-all');
        if (selectAllCb) {
            selectAllCb.click();
        }
    }
    
    if (window.selectedDsTables && window.selectedDsTables.length > 0) {
        await window.executeDatasetStep2(step2Btn);
    }
};"""

if not old_code_regex.search(js):
    print("Could not match the old code regex!")
else:
    js = old_code_regex.sub(new_code, js, count=1)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Successfully patched executeDatasetStep2!")
