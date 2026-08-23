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
        
        # Test collapse toggle on workspace-list
        await page.evaluate("""() => {
            const label = document.querySelector('label[onclick*="workspace-list"]');
            if (label) label.click();
        }""")
        await page.wait_for_timeout(300)
        
        resCollapse = await page.evaluate("""() => {
            const list = document.getElementById('workspace-list');
            const headerBar = document.querySelector('.grid-header-bar[data-list-id="workspace-list"]');
            return {
                listDisplay: list.style.display,
                headerBarDisplay: headerBar.style.display
            };
        }""")
        
        # Toggle back
        await page.evaluate("""() => {
            const label = document.querySelector('label[onclick*="workspace-list"]');
            if (label) label.click();
        }""")
        await page.wait_for_timeout(300)
        
        resExpand = await page.evaluate("""() => {
            const list = document.getElementById('workspace-list');
            const headerBar = document.querySelector('.grid-header-bar[data-list-id="workspace-list"]');
            return {
                listDisplay: list.style.display,
                headerBarDisplay: headerBar.style.display
            };
        }""")
        
        sys.stdout.buffer.write(f'Collapse Test Result: {resCollapse}\nExpand Test Result: {resExpand}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
