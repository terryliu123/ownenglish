"""Test script to check if notifications module can be imported."""
import sys
sys.path.insert(0, r'D:\pcode\ownenglish\server')

try:
    print("Testing imports...")

    # Test 1: Import models
    print("\n1. Testing app.models import...")
    from app.models import Notification, NotificationType
    print(f"   OK - Notification: {Notification}")
    print(f"   OK - NotificationType: {NotificationType}")

    # Test 2: Import notifications router
    print("\n2. Testing app.api.v1.notifications import...")
    from app.api.v1 import notifications
    print(f"   OK - notifications module: {notifications}")
    print(f"   OK - router: {notifications.router}")
    print(f"   OK - create_notification: {notifications.create_notification}")

    # Test 3: Import from main
    print("\n3. Testing app.main import...")
    from app import main
    print(f"   OK - main module loaded")

    print("\n✓ All imports successful!")

except Exception as e:
    print(f"\n✗ Import error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
