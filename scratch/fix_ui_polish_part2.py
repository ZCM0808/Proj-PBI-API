import os

SCRIPT_FILE = 'static/script.js'

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update runCheckPermsWorkflow to format the list and scroll
old_check_perms = """        const data = await res.json();
        out.textContent += JSON.stringify(data, null, 2) + '\\n\\n';
        out.textContent += `[Success] Permission check complete.`;
    } catch (e) {
        out.textContent += `Exception: ${e.message}\\n`;
    } finally {"""

new_check_perms = """        const data = await res.json();
        
        if (data.features && Array.isArray(data.features)) {
            let listOutput = "Available Permissions & Features:\\n";
            listOutput += "=================================================\\n";
            listOutput += "Feature Name".padEnd(55) + "State\\n";
            listOutput += "-------------------------------------------------------\\n";
            data.features.forEach(f => {
                const fName = (f.name || 'Unknown').padEnd(55);
                const fState = f.state || 'N/A';
                listOutput += `${fName} [${fState}]\\n`;
            });
            out.textContent += listOutput + '\\n';
        } else {
            out.textContent += JSON.stringify(data, null, 2) + '\\n\\n';
        }
        
        out.textContent += `[Success] Permission check complete.\\n`;
        out.scrollTop = out.scrollHeight;
    } catch (e) {
        out.textContent += `Exception: ${e.message}\\n`;
        out.scrollTop = out.scrollHeight;
    } finally {"""

if old_check_perms in js:
    js = js.replace(old_check_perms, new_check_perms)

# 2. Add scrollTop to RVC workflow when the table updates
if "statusDiv.textContent = `Analysis Complete:" in js and "outDiv.scrollTop = outDiv.scrollHeight;" not in js:
    js = js.replace(
        "statusDiv.style.color = 'var(--success)';",
        "statusDiv.style.color = 'var(--success)';\n        outDiv.scrollTop = outDiv.scrollHeight;"
    )

with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
    f.write(js)

print("JS patched.")
