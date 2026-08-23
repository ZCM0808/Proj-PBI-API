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
        
        # Dispatch extreme right drag resize to test max boundary overflow defense
        res = await page.evaluate("""() => {
            const resizer = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="id"] .col-resizer');
            if (resizer) {
                const rect = resizer.getBoundingClientRect();
                resizer.dispatchEvent(new MouseEvent('mousedown', { clientX: rect.left, clientY: rect.top, bubbles: true }));
                // Try moving mouse far to the right (+800px)
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 800, clientY: rect.top, bubbles: true }));
                window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
            
            const modalBody = document.querySelector('#settings-modal .modal-body');
            const row = document.querySelector('#workspace-list').firstElementChild;
            const delBtn = row.querySelector('button');
            const modalRect = modalBody.getBoundingClientRect();
            const btnRect = delBtn.getBoundingClientRect();
            
            return {
                modalRight: modalRect.right,
                btnRight: btnRect.right,
                isOverflowing: btnRect.right > modalRect.right + 2 // allow 2px margin of error
            };
        }""")
        
        sys.stdout.buffer.write(f'Extreme Drag Overflow Test Result:\n{res}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
