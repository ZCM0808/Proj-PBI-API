import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(permissions=['clipboard-read', 'clipboard-write'])
        page = await context.new_page()
        
        await page.goto('http://127.0.0.1:8000/')
        await page.wait_for_timeout(2000)
        
        # Test clicking the Tenant copy button
        resTenant = await page.evaluate("""() => {
            const btn = document.querySelector('#display-tenant .copy-icon-wrapper');
            const target = document.getElementById('display-tenant');
            if (btn) btn.click();
            return {
                btnHasAnim: btn ? btn.classList.contains('flash-success-anim') : false,
                targetHasAnim: target ? target.classList.contains('flash-success-anim') : false
            };
        }""")
        
        # Test clicking the Request Body copy button
        resReqBody = await page.evaluate("""() => {
            const textarea = document.getElementById('request-body');
            if (textarea) textarea.value = '{"test": "data"}';
            const btn = document.getElementById('copy-req-body-btn');
            if (btn) btn.click();
            return {
                btnHasAnim: btn ? btn.classList.contains('flash-success-anim') : false,
                targetHasAnim: textarea ? textarea.classList.contains('flash-success-anim') : false
            };
        }""")
        
        # Test clicking the Response Body copy button
        resResBody = await page.evaluate("""() => {
            const btn = document.getElementById('copy-res-body-btn');
            if (btn) btn.click();
            const target = document.querySelector('.response-body table.json-rendered-table') || document.getElementById('response-output');
            return {
                btnHasAnim: btn ? btn.classList.contains('flash-success-anim') : false,
                targetHasAnim: target ? (target.classList.contains('flash-success-anim') || (target.parentElement && target.parentElement.classList.contains('flash-success-anim'))) : false
            };
        }""")
        
        sys.stdout.buffer.write(f'Copy Button Double Flash Test:\nTenant: {resTenant}\nReqBody: {resReqBody}\nResBody: {resResBody}\n'.encode('utf-8'))
        await browser.close()

asyncio.run(main())
