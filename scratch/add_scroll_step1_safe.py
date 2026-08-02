import re
with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Error: Please select Workspace...
js = js.replace("consoleOut.innerText = '❌ Error: Please select Workspace and Dataset first.';\n", "consoleOut.innerText = '❌ Error: Please select Workspace and Dataset first.';\n        setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);\n")

# 2. consoleOut.innerText = requestStr;
js = js.replace("consoleOut.innerText = requestStr;\n", "consoleOut.innerText = requestStr;\n    setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);\n")

# 3. JSON.stringify
js = js.replace("JSON.stringify(tables, null, 2);\n", "JSON.stringify(tables, null, 2);\n            setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);\n")

# 4. Failed: data.message
js = js.replace("`\\n❌ Failed:\\n` + data.message;\n", "`\\n❌ Failed:\\n` + data.message;\n            setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);\n")

# 5. Network Error: err.message
# Wait, this exists in loadDatasetTablesStep1 and maybe others, but checking context
js = re.sub(r"(`\\n❌ Network Error:\\n` \+ err\.message;)", r"\1\n            setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);", js)

# Step 2: Error: Please ensure Step 1 is complete
js = js.replace("consoleOut.innerText = '❌ Error: Please ensure Step 1 is complete and at least one Table is selected.';\n", "consoleOut.innerText = '❌ Error: Please ensure Step 1 is complete and at least one Table is selected.';\n        setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);\n")

# Step 2: Starting export of...
js = js.replace("consoleOut.innerText = `⏳ Starting export of ${selectedTables.length} table(s) as ${exportFormat}...`;\n", "consoleOut.innerText = `⏳ Starting export of ${selectedTables.length} table(s) as ${exportFormat}...`;\n    setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);\n")


with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("done")
