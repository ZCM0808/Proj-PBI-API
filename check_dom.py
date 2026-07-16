import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # open the local index.html directly
        file_url = f"file:///{os.path.abspath('static/index.html').replace(chr(92), '/')}"
        await page.goto(file_url)
        
        for sel in ['.sidebar', '.nav-menu', '.request-builder', '.response-container', '#theme-toggle-btn', '#request-body']:
            el = await page.query_selector(sel)
            if el:
                box = await el.bounding_box()
                print(f"{sel} box: {box}")
            else:
                print(f"{sel} NOT FOUND")
        
        await browser.close()

asyncio.run(main())
