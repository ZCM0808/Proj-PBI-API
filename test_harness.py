import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        logs = []
        errors = []
        page.on('console', lambda msg: logs.append(f'[{msg.type}] {msg.text}'))
        page.on('pageerror', lambda err: errors.append(str(err)))
        
        await page.goto('http://127.0.0.1:8000/')
        await page.wait_for_timeout(3000)
        
        # Click harness button
        await page.click('#btn-test-harness', timeout=3000)
        await page.wait_for_timeout(800)
        
        modal_state = await page.evaluate('''() => {
            const m = document.getElementById('test-harness-modal');
            if (!m) return {error: 'modal not found'};
            return {
                display: m.style.display,
                computedDisplay: window.getComputedStyle(m).display
            }
        }''')
        
        sys.stdout.buffer.write(f'Page errors: {errors}\n'.encode('utf-8'))
        sys.stdout.buffer.write(f'Console logs: {logs}\n'.encode('utf-8'))
        sys.stdout.buffer.write(f'Modal state after click: {modal_state}\n'.encode('utf-8'))
        
        # Test close and reopen
        if modal_state.get('display') == 'flex':
            close_btn = page.locator('#test-harness-modal .close-modal')
            await close_btn.click()
            await page.wait_for_timeout(400)
            await page.click('#btn-test-harness')
            await page.wait_for_timeout(400)
            state2 = await page.evaluate('''() => {
                const m = document.getElementById('test-harness-modal');
                return { display: m.style.display }
            }''')
            sys.stdout.buffer.write(f'Modal state after reopen: {state2}\n'.encode('utf-8'))
        
        await browser.close()

asyncio.run(main())
