import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add JSZip
jszip_script = '<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>'
if jszip_script not in html:
    html = html.replace('<script src="https://cdn.jsdelivr.net/npm/powerbi-client/dist/powerbi.min.js"></script>',
                        '<script src="https://cdn.jsdelivr.net/npm/powerbi-client/dist/powerbi.min.js"></script>\n    ' + jszip_script)

html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v35_export_all', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Update loadPages
old_loadPages_inner = """                    pageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
                    pages.forEach(p => {"""
new_loadPages_inner = """                    pageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
                    pageSelect.innerHTML += '<option value="ALL">🌟 ALL PAGES (全部页面) 🌟</option>';
                    pages.forEach(p => {"""
if "🌟 ALL PAGES" not in script:
    script = script.replace(old_loadPages_inner, new_loadPages_inner)

# Update loadVisuals
old_loadVisuals_inner = """            if (!pId || !currentEmbeddedReport) return;
            
            try {
                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);"""
new_loadVisuals_inner = """            if (!pId || !currentEmbeddedReport) return;
            
            if (pId === 'ALL') {
                visSelect.innerHTML = '<option value="ALL">🌟 ALL VISUALS IN ALL PAGES 🌟</option>';
                return;
            }
            
            try {
                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);"""
if "🌟 ALL VISUALS IN ALL PAGES" not in script:
    script = script.replace(old_loadVisuals_inner, new_loadVisuals_inner)

old_loadVisuals_inner2 = """                const visuals = await activePage.getVisuals();
                visSelect.innerHTML = '<option value="">-- Select a Visual --</option>';
                visuals.forEach(v => {"""
new_loadVisuals_inner2 = """                const visuals = await activePage.getVisuals();
                visSelect.innerHTML = '<option value="">-- Select a Visual --</option>';
                visSelect.innerHTML += '<option value="ALL">🌟 ALL VISUALS ON THIS PAGE 🌟</option>';
                visuals.forEach(v => {"""
if "🌟 ALL VISUALS ON THIS PAGE" not in script:
    script = script.replace(old_loadVisuals_inner2, new_loadVisuals_inner2)

# Update executeExportVisual
old_execute = """        const executeExportVisual = async () => {
            const out = document.getElementById('wf-out-vis');
            out.textContent = `[${new Date().toLocaleTimeString()}] Triggering JS SDK exportData()...\\n`;
            
            const pId = document.getElementById('wf-vis-page').value;
            const visId = document.getElementById('wf-vis-visual').value;
            const expTypeStr = document.getElementById('wf-vis-type').value;
            const rows = parseInt(document.getElementById('wf-vis-rows').value) || 100000;
            
            if (!pId || !visId || !currentEmbeddedReport) {
                out.textContent += `Error: Please select page and visual.\\n`;
                return;
            }
            
            try {
                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);
                const visuals = await activePage.getVisuals();
                const targetVisual = visuals.find(v => v.name === visId);
                
                if (!targetVisual) {
                    out.textContent += `Error: Visual not found.\\n`;
                    return;
                }
                
                const models = window['powerbi-client'].models;
                const exportType = (expTypeStr === 'Summarized') ? models.ExportDataType.Summarized : models.ExportDataType.Underlying;
                
                out.textContent += `Extracting data from visual [${targetVisual.type}] (Rows: ${rows})...\\n`;
                const result = await targetVisual.exportData(exportType, rows);
                
                out.textContent += `\\nData successfully extracted! Generating CSV file...\\n`;
                
                const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `VisualExport_${expTypeStr}.csv`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                out.textContent += `\\nFile downloaded: VisualExport_${expTypeStr}.csv 🎉\\n`;
                
            } catch (err) {
                out.textContent += `Exception during export: ${err.message || JSON.stringify(err)}\\n`;
            }
        };"""

new_execute = """        const executeExportVisual = async () => {
            const out = document.getElementById('wf-out-vis');
            out.textContent = `[${new Date().toLocaleTimeString()}] Triggering Batch JS SDK exportData()...\\n`;
            
            const pId = document.getElementById('wf-vis-page').value;
            const visId = document.getElementById('wf-vis-visual').value;
            const expTypeStr = document.getElementById('wf-vis-type').value;
            const rows = parseInt(document.getElementById('wf-vis-rows').value) || 100000;
            
            if (!pId || !visId || !currentEmbeddedReport) {
                out.textContent += `Error: Please select page and visual.\\n`;
                return;
            }
            
            try {
                const models = window['powerbi-client'].models;
                const exportType = (expTypeStr === 'Summarized') ? models.ExportDataType.Summarized : models.ExportDataType.Underlying;
                
                const zip = new JSZip();
                let fileCount = 0;
                
                const pages = await currentEmbeddedReport.getPages();
                const targetPages = (pId === 'ALL') ? pages : pages.filter(p => p.name === pId);
                
                for (let page of targetPages) {
                    out.textContent += `\\n> Navigating to Page: [${page.displayName}]...\\n`;
                    await page.setActive();
                    await new Promise(r => setTimeout(r, 1500)); // wait for visuals to load
                    
                    const visuals = await page.getVisuals();
                    const targetVisuals = (visId === 'ALL') ? visuals : visuals.filter(v => v.name === visId);
                    
                    for (let visual of targetVisuals) {
                        const vName = visual.title || visual.type || visual.name;
                        out.textContent += `  - Visual [${vName}]: Extracting...`;
                        try {
                            const result = await visual.exportData(exportType, rows);
                            const safePageName = page.displayName.replace(/[^a-zA-Z0-9_\\u4e00-\\u9fa5]/g, '_');
                            const safeVisName = vName.replace(/[^a-zA-Z0-9_\\u4e00-\\u9fa5]/g, '_');
                            const fileName = `${safePageName}_${safeVisName}.csv`;
                            zip.file(fileName, result.data);
                            fileCount++;
                            out.textContent += ` OK\\n`;
                        } catch (e) {
                            out.textContent += ` SKIPPED (No data or unsupported)\\n`;
                        }
                    }
                }
                
                if (fileCount > 0) {
                    out.textContent += `\\nData successfully extracted (${fileCount} files)! Generating ZIP archive...\\n`;
                    const content = await zip.generateAsync({type:"blob"});
                    const url = URL.createObjectURL(content);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `BatchVisualExport_${expTypeStr}.zip`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    out.textContent += `\\nArchive downloaded: BatchVisualExport_${expTypeStr}.zip 🎉\\n`;
                } else {
                    out.textContent += `\\nWARNING: No exportable data found in the selected targets.\\n`;
                }
                
            } catch (err) {
                out.textContent += `Exception during export: ${err.message || JSON.stringify(err)}\\n`;
            }
        };"""

if "BatchVisualExport" not in script:
    script = script.replace(old_execute, new_execute)
    
script = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v35_export_all', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("All export options added successfully!")
