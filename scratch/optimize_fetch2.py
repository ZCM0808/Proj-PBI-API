import codecs

def patch():
    path = r"D:\ZCM\Proj-PBI-API\static\script.js"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start = -1
    end = -1
    for i, line in enumerate(lines):
        if "const resPbi = await fetch('/static/swagger.json');" in line:
            start = i - 1
        if start != -1 and 'console.warn("Failed to load Fabric Swagger:", e);' in line:
            end = i + 2
            break

    if start != -1 and end != -1:
        old = ''.join(lines[start:end])
        new_logic = '''        try {
            const [resPbi, resFabric] = await Promise.all([
                fetch('/static/swagger.json').catch(e => { console.error("Failed to load Power BI Swagger:", e); return null; }),
                fetch('/static/fabric_swagger.json').catch(e => { console.warn("Failed to load Fabric Swagger:", e); return null; })
            ]);

            if (resPbi && resPbi.ok) {
                swagger = await resPbi.json();
            } else if (resPbi) {
                console.error("Failed to load Power BI Swagger: server returned status", resPbi.status);
            }

            if (resFabric && resFabric.ok) {
                fabricSwagger = await resFabric.json();
            } else if (resFabric) {
                console.warn("Failed to load Fabric Swagger: server returned status", resFabric.status);
            }
        } catch (e) {
            console.error("Error during parallel swagger fetch:", e);
        }\n'''
        
        content = ''.join(lines).replace(old, new_logic)
        with codecs.open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Replaced successfully")
    else:
        print("Could not find block")

if __name__ == "__main__":
    patch()
