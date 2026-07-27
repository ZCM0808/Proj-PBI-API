import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

replacement = """                let responseBody = await res.text();
                try {
                    const parsed = JSON.parse(responseBody);
                    responseBody = JSON.stringify(parsed, null, 2);
                } catch(e) {}
                
                // Extreme Boundary Defense: Prevent DOM freeze on massive payloads
                if (responseBody.length > 500000) {
                    const originalLength = responseBody.length;
                    responseBody = responseBody.substring(0, 500000) + `\\n\\n... [Response Truncated: Original size was ${(originalLength / 1024 / 1024).toFixed(2)} MB. Showing first 500KB to prevent UI freeze]`;
                }
                
                responseOutput.textContent = responseBody;"""

script = re.sub(
    r"                let responseBody = await res\.text\(\);\s*try \{\s*const parsed = JSON\.parse\(responseBody\);\s*responseBody = JSON\.stringify\(parsed, null, 2\);\s*\} catch\(e\) \{\}\s*responseOutput\.textContent = responseBody;",
    replacement,
    script
)

script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v17_truncate', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v17_truncate', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Response payload truncation defense applied!")
