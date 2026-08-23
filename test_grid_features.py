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
        
        # 1. Verify title counts
        wsCountText = await page.evaluate("() => document.getElementById('workspace-count').textContent")
        
        # 2. Single sort click
        await page.evaluate("""() => {
            const hdr = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="alias"]');
            if (hdr) hdr.click();
        }""")
        await page.wait_for_timeout(300)
        
        sort1 = await page.evaluate("""() => {
            const icon = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="alias"] .sort-icon');
            return icon ? icon.textContent : 'none';
        }""")
        
        # 3. Shift+Click multi-sort
        await page.evaluate("""() => {
            const hdr = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="type"]');
            if (hdr) hdr.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        }""")
        await page.wait_for_timeout(300)
        
        sortMulti = await page.evaluate("""() => {
            const bar = document.querySelector('.grid-header-bar[data-list-id="workspace-list"]');
            return {
                alias: bar.querySelector('.grid-col-header[data-col="alias"] .sort-icon').innerHTML,
                type: bar.querySelector('.grid-col-header[data-col="type"] .sort-icon').innerHTML
            };
        }""")
        
        res = {
            'wsCountText': wsCountText,
            'sort1': sort1,
            'sortMulti': sortMulti
        }
        sys.stdout.buffer.write(f'E2E Feature Test Result:\n{res}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
