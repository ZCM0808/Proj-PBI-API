import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('http://127.0.0.1:8000/')
        await page.wait_for_timeout(2000)
        
        # Open Settings modal
        await page.click('#btn-settings')
        await page.wait_for_timeout(1000)
        
        # 1. Get initial width of alias header & input
        initialWidths = await page.evaluate("""() => {
            const hdr = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="alias"]');
            const inp = document.querySelector('#workspace-list .alias-input');
            return {
                hdrWidth: window.getComputedStyle(hdr).width,
                inpWidth: window.getComputedStyle(inp).width
            };
        }""")
        
        # 2. Dispatch drag resize events
        await page.evaluate("""() => {
            const resizer = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .col-resizer');
            if (resizer) {
                const rect = resizer.getBoundingClientRect();
                resizer.dispatchEvent(new MouseEvent('mousedown', { clientX: rect.left, clientY: rect.top, bubbles: true }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 100, clientY: rect.top, bubbles: true }));
                window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
        }""")
        await page.wait_for_timeout(300)
        
        # 3. Get resized width of alias header & inputs
        resizedWidths = await page.evaluate("""() => {
            const hdr = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="alias"]');
            const inp = document.querySelector('#workspace-list .alias-input');
            return {
                hdrWidth: window.getComputedStyle(hdr).width,
                inpWidth: window.getComputedStyle(inp).width
            };
        }""")
        
        sys.stdout.buffer.write(f'Initial Widths: {initialWidths}\nResized Widths: {resizedWidths}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
