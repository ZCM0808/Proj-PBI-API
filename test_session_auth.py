import asyncio, sys, time
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # 1. Login
        await page.goto('http://127.0.0.1:8000/login')
        await page.fill('#password', 'admin123') # Replace with test pass if needed
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(1000)
        
        # 2. Check main page loaded
        url = page.url
        sys.stdout.buffer.write(f'Logged in page URL: {url}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
