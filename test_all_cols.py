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
        
        # Verify initial layout alignment across headers and inputs for all 3 columns
        alignment = await page.evaluate("""() => {
            const getW = selector => window.getComputedStyle(document.querySelector(selector)).width;
            return {
                hdrAlias: getW('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="alias"]'),
                rowAlias: getW('#workspace-list .alias-input'),
                hdrId: getW('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="id"]'),
                rowId: getW('#workspace-list .id-input'),
                hdrType: getW('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="type"]'),
                rowType: getW('#workspace-list .type-input')
            };
        }""")
        
        # Drag Col 3 (Type & State)
        await page.evaluate("""() => {
            const resizer = document.querySelector('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="type"] .col-resizer');
            if (resizer) {
                const rect = resizer.getBoundingClientRect();
                resizer.dispatchEvent(new MouseEvent('mousedown', { clientX: rect.left, clientY: rect.top, bubbles: true }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 50, clientY: rect.top, bubbles: true }));
                window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            }
        }""")
        await page.wait_for_timeout(300)
        
        resizedType = await page.evaluate("""() => {
            const getW = selector => window.getComputedStyle(document.querySelector(selector)).width;
            return {
                hdrType: getW('.grid-header-bar[data-list-id="workspace-list"] .grid-col-header[data-col="type"]'),
                rowType: getW('#workspace-list .type-input')
            };
        }""")
        
        sys.stdout.buffer.write(f'Initial Alignment:\n{alignment}\nResized Col 3:\n{resizedType}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
