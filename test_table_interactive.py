import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('http://127.0.0.1:8000/')
        await page.wait_for_timeout(2000)
        
        # Trigger an API request or inject fake JSON to test table mode
        await page.evaluate("""() => {
            window.currentJsonResponse = {
                "value": [
                    {"id": "ws-101", "name": "Sales Analytics", "type": "Workspace", "state": "Active"},
                    {"id": "ws-102", "name": "Marketing Hub", "type": "Workspace", "state": "Active"}
                ]
            };
            window.updateViewMode('table');
        }""")
        await page.wait_for_timeout(500)
        
        res = await page.evaluate("""() => {
            const th = document.querySelector('.data-table th');
            const td = document.querySelector('.data-table td');
            const resizer = th ? th.querySelector('.col-resizer') : null;
            return {
                thText: th ? th.textContent : '',
                hasResizer: !!resizer,
                tdText: td ? td.textContent : '',
                tdCursor: td ? window.getComputedStyle(td).cursor : ''
            };
        }""")
        
        sys.stdout.buffer.write(f'JSON Table Resize & Cell Interactive Test:\n{res}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
