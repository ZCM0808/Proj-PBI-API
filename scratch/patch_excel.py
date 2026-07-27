import re

# --- 1. Modify index.html ---
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add SheetJS
sheetjs = '<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>'
if sheetjs not in html:
    # replace JSZip with SheetJS, or just keep both
    html = html.replace('<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>',
                        '<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>\n    ' + sheetjs)

# Hide the iframe (off-screen rendering)
old_iframe = '<div id="pbi-embed-container" style="display: none; width: 100%; height: 350px; margin-bottom: 12px; border: 1px solid var(--panel-border); border-radius: 6px; background: #fff;"></div>'
new_iframe = '<div id="pbi-embed-container" style="visibility: hidden; position: absolute; left: -9999px; top: -9999px; width: 1200px; height: 800px;"></div>'
if old_iframe in html:
    html = html.replace(old_iframe, new_iframe)

html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v36_excel_hidden', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# --- 2. Modify script.js ---
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Make sure embedContainer shows safely (we removed display: none initially, but if it is, set to block)
old_show = "embedContainer.style.display = 'block';"
new_show = "embedContainer.style.display = 'block';" # No change needed here, it stays off-screen

# Update executeExportVisual to use Excel
old_execute = """        const executeExportVisual = async () => {
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

new_execute = """        const executeExportVisual = async () => {
            const out = document.getElementById('wf-out-vis');
            out.textContent = `[${new Date().toLocaleTimeString()}] Triggering JS SDK exportData() -> Excel...\\n`;
            
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
                
                const wb = XLSX.utils.book_new();
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
                            
                            // Parse CSV to Excel Worksheet
                            const tempWb = XLSX.read(result.data, {type: 'string'});
                            const ws = tempWb.Sheets[tempWb.SheetNames[0]];
                            
                            // Generate safe Sheet Name (Max 31 chars, no invalid chars)
                            let rawSheetName = (pId === 'ALL') ? `${page.displayName}_${vName}` : vName;
                            let sheetName = rawSheetName.replace(/[\\\\\\/\\*\\?\\:\\[\\]]/g, '').trim();
                            if (sheetName.length > 31) sheetName = sheetName.substring(0, 31).trim();
                            if (!sheetName) sheetName = "Sheet";
                            
                            // Ensure uniqueness
                            if (wb.SheetNames.includes(sheetName)) {
                                let suffix = 1;
                                while(wb.SheetNames.includes(sheetName.substring(0, 27) + "_" + suffix)) suffix++;
                                sheetName = sheetName.substring(0, 27) + "_" + suffix;
                            }
                            
                            XLSX.utils.book_append_sheet(wb, ws, sheetName);
                            fileCount++;
                            out.textContent += ` OK (Appended to Sheet: ${sheetName})\\n`;
                        } catch (e) {
                            out.textContent += ` SKIPPED (No data or unsupported)\\n`;
                        }
                    }
                }
                
                if (fileCount > 0) {
                    out.textContent += `\\nData successfully extracted (${fileCount} sheets)! Generating Excel file...\\n`;
                    XLSX.writeFile(wb, `PowerBI_Export_${expTypeStr}.xlsx`);
                    out.textContent += `\\nExcel file downloaded: PowerBI_Export_${expTypeStr}.xlsx 🎉\\n`;
                } else {
                    out.textContent += `\\nWARNING: No exportable data found in the selected targets.\\n`;
                }
                
            } catch (err) {
                out.textContent += `Exception during export: ${err.message || JSON.stringify(err)}\\n`;
            }
        };"""

if "XLSX.writeFile" not in script:
    script = script.replace(old_execute, new_execute)

script = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v36_excel_hidden', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Excel features applied successfully!")
