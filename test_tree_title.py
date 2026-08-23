import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('http://127.0.0.1:8000/')
        await page.wait_for_timeout(2000)
        
        # Switch theme to light
        await page.evaluate("() => document.documentElement.setAttribute('data-theme', 'light')")
        await page.wait_for_timeout(500)
        
        # Get category title color and hover background
        res = await page.evaluate("""() => {
            const title = document.querySelector('.api-category-title');
            if (!title) return null;
            
            const beforeHover = window.getComputedStyle(title).color;
            title.classList.add('hover-test');
            // Trigger hover style evaluation
            const bgHover = window.getComputedStyle(title).backgroundColor;
            
            return {
                beforeHoverColor: beforeHover,
                bgHover: bgHover,
                borderRadius: window.getComputedStyle(title).borderRadius
            };
        }""")
        
        sys.stdout.buffer.write(f'Category Title Theme Test:\n{res}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
