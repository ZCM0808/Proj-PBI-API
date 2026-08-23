import traceback
from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("http://localhost:8000")
            
            # Wait for groups to render
            page.wait_for_selector(".api-category", timeout=10000)
            
            # Expand the first category
            page.click(".api-category")
            
            # Click the first API item
            page.click(".api-item")
            
            # Click Send Request
            page.wait_for_selector("#send-request:not([disabled])", timeout=10000)
            page.click("#send-request")
            
            # Wait for table
            page.wait_for_selector(".data-table th", timeout=15000)
            
            # Find the header "id" or the first one
            th = page.locator(".data-table th").first
            
            rows_before = page.locator(".data-table tbody tr").all()
            if not rows_before:
                print("No rows found!")
                return
                
            first_cell_before = rows_before[0].locator("td").first.inner_text()
            print(f"Before sort: {first_cell_before}")
            
            # Click to sort
            th.click()
            page.wait_for_timeout(1000)
            
            rows_after = page.locator(".data-table tbody tr").all()
            first_cell_after = rows_after[0].locator("td").first.inner_text()
            print(f"After sort: {first_cell_after}")
            
            # Print browser console logs
            print("Done")
            
        except Exception as e:
            print(f"Error: {e}")
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    test()
