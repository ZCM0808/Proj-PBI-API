import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('http://127.0.0.1:8000/')
        await page.wait_for_timeout(2000)
        
        # Switch to light mode and render table
        await page.evaluate("""() => {
            document.documentElement.setAttribute('data-theme', 'light');
            window.currentJsonResponse = {
                "value": [
                    {"id": "ws-101", "name": "Sales Analytics", "type": "Workspace", "state": "Active"}
                ]
            };
            window.updateViewMode('table');
        }""")
        await page.wait_for_timeout(500)
        
        # Inspect exact computed colors of all text elements in table view
        res = await page.evaluate("""() => {
            const th = document.querySelector('.data-table th');
            const thSpan = document.querySelector('.data-table th span');
            const td = document.querySelector('.data-table td');
            const title = document.querySelector('.response-body span');
            
            return {
                themeAttr: document.documentElement.getAttribute('data-theme'),
                thComputedColor: th ? window.getComputedStyle(th).color : '',
                thSpanComputedColor: thSpan ? window.getComputedStyle(thSpan).color : '',
                tdComputedColor: td ? window.getComputedStyle(td).color : '',
                titleComputedColor: title ? window.getComputedStyle(title).color : ''
            };
        }""")
        
        sys.stdout.buffer.write(f'Computed Colors in Light Mode:\n{res}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
