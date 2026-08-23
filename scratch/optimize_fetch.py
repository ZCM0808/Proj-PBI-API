import codecs
import re

def patch_fetch():
    path = r"D:\ZCM\Proj-PBI-API\static\script.js"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_logic = """        try {
            const resPbi = await fetch('/static/swagger.json');
            if (resPbi.ok) {
                swagger = await resPbi.json();
            } else {
                console.error("Failed to load Power BI Swagger: server returned status", resPbi.status);
            }
        } catch (e) {
            console.error("Failed to load Power BI Swagger:", e);
        }

        try {
            const resFabric = await fetch('/static/fabric_swagger.json');
            if (resFabric.ok) {
                fabricSwagger = await resFabric.json();
            } else {
                console.warn("Failed to load Fabric Swagger: server returned status", resFabric.status);
            }
        } catch (e) {
            console.warn("Failed to load Fabric Swagger:", e);
        }"""

    new_logic = """        try {
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
        }"""

    if old_logic in content:
        content = content.replace(old_logic, new_logic)
        with codecs.open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched parallel fetch.")
    else:
        print("Could not find fetch logic to replace.")

if __name__ == "__main__":
    patch_fetch()
