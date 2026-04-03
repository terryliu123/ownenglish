from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # Set to True for headless mode
    context = browser.new_context()

    # Capture console logs
    console_logs = []
    def handle_console(msg):
        log_entry = f"[{msg.type}] {msg.text}"
        console_logs.append(log_entry)
        print(log_entry)

    page = context.new_page()
    page.on("console", handle_console)

    # Navigate to login page
    print("=== Navigating to login page ===")
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')

    # Take screenshot of login page
    page.screenshot(path='D:/pcode/ownenglish/test_login.png')
    print("Screenshot saved: test_login.png")

    # Try to login as teacher
    print("\n=== Attempting login as teacher ===")
    try:
        # Find email input
        email_input = page.locator('input[type="email"]').first
        if email_input.count() > 0:
            email_input.fill('teacher@example.com')
            print("Filled email")

        # Find password input
        password_input = page.locator('input[type="password"]').first
        if password_input.count() > 0:
            password_input.fill('password')
            print("Filled password")

        # Click login button
        login_btn = page.locator('button:has-text("登录"), button:has-text("Login"), button[type="submit"]').first
        if login_btn.count() > 0:
            login_btn.click()
            print("Clicked login button")

        # Wait for navigation
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        page.screenshot(path='D:/pcode/ownenglish/test_after_login.png')
        print("Screenshot saved: test_after_login.png")

    except Exception as e:
        print(f"Login error: {e}")

    # Navigate to live classroom
    print("\n=== Navigating to live classroom ===")
    page.goto('http://localhost:5173/teacher/live')
    page.wait_for_load_state('networkidle')
    time.sleep(3)

    page.screenshot(path='D:/pcode/ownenglish/test_live.png', full_page=True)
    print("Screenshot saved: test_live.png")

    # Check for WebSocket connection status
    print("\n=== Checking WebSocket status ===")
    try:
        ws_status = page.locator('text=/在线|未连接|连接中/').first
        if ws_status.count() > 0:
            print(f"WebSocket status element found: {ws_status.text_content()}")
    except Exception as e:
        print(f"Could not find WebSocket status: {e}")

    # Check for task groups
    print("\n=== Checking for task groups ===")
    try:
        task_groups = page.locator('.surface-card, [class*="group"]').all()
        print(f"Found {len(task_groups)} potential task group elements")

        # Try to find and click on a task group
        group_buttons = page.locator('button').all()
        print(f"Found {len(group_buttons)} buttons")

        for btn in group_buttons:
            text = btn.text_content()
            if text and ('组' in text or '题' in text or len(text) > 0):
                print(f"Button: {text[:50]}")

    except Exception as e:
        print(f"Error checking task groups: {e}")

    # Wait a bit to capture any WebSocket messages
    print("\n=== Waiting for WebSocket messages ===")
    time.sleep(5)

    # Print all console logs
    print("\n=== Console Logs ===")
    for log in console_logs:
        print(log)

    browser.close()
    print("\n=== Test completed ===")
