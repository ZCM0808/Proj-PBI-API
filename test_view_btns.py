import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('http://127.0.0.1:8000/')
        await page.wait_for_timeout(2000)
        
        # Check font sizes of view mode buttons
        res = await page.evaluate("""() => {
            const btns = document.querySelectorAll('.view-mode-btn');
            const data = {};
            btns.forEach(btn => {
                const mode = btn.getAttribute('data-mode');
                const style = window.getComputedStyle(btn);
                data[mode] = {
                    fontSize: style.fontSize,
                    padding: style.padding,
                    fontWeight: style.fontWeight,
                    text: btn.textContent.trim()
                };
            });
            return data;
        }""")
        
        sys.stdout.buffer.write(f'View Mode Buttons Test:\n{res}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
