"""CLI commands for OwnEnglish admin tasks."""
import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import async_session_maker
from app.models import User, UserRole
from app.core.security import get_password_hash


async def create_admin(email: str, password: str, name: str):
    """Create an admin user."""
    async with async_session_maker() as db:
        # Check if user already exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"用户已存在: {email}")
            return

        user = User(
            email=email,
            name=name,
            role=UserRole.ADMIN,
            password_hash=get_password_hash(password)
        )
        db.add(user)
        await db.commit()
        print(f"管理员创建成功: {email}")


def main():
    if len(sys.argv) < 3:
        print("用法: python -m app.cli create-admin <email> <password> <name>")
        print("示例: python -m app.cli create-admin admin@ownenglish.com password123 超级管理员")
        sys.exit(1)

    command = sys.argv[1]

    if command == "create-admin":
        if len(sys.argv) < 5:
            print("用法: python -m app.cli create-admin <email> <password> <name>")
            sys.exit(1)
        email = sys.argv[2]
        password = sys.argv[3]
        name = sys.argv[4]
        asyncio.run(create_admin(email, password, name))
    else:
        print(f"未知命令: {command}")
        print("可用命令: create-admin")
        sys.exit(1)


if __name__ == "__main__":
    main()
