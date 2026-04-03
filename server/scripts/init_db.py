"""Initialize database with test accounts."""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import get_settings
from app.models import Base, User, TeacherProfile, StudentProfile, UserRole
from app.core.security import get_password_hash

settings = get_settings()

# Use absolute path for database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ownenglish.db')
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

print(f"Database path: {DB_PATH}")

async def init_db():
    """Create tables and test accounts."""
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Create tables if they don't exist (preserve existing data)
        await conn.run_sync(Base.metadata.create_all)

    print("[OK] Database tables ready")

    # Create test accounts
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if test teacher exists
        result = await session.execute(
            select(User).where(User.email == "teacher@test.com")
        )
        if not result.scalar_one_or_none():
            # Create test teacher
            teacher = User(
                email="teacher@test.com",
                username="teacher",
                password_hash=get_password_hash("123456"),
                name="测试老师",
                role=UserRole.TEACHER,
            )
            session.add(teacher)
            await session.flush()

            profile = TeacherProfile(user_id=teacher.id)
            session.add(profile)

            print(f"[OK] Created test teacher: teacher@test.com / 123456")

        # Check if test student exists
        result = await session.execute(
            select(User).where(User.email == "student@test.com")
        )
        if not result.scalar_one_or_none():
            # Create test student
            student = User(
                email="student@test.com",
                username="student",
                password_hash=get_password_hash("123456"),
                name="测试学生",
                role=UserRole.STUDENT,
            )
            session.add(student)
            await session.flush()

            profile = StudentProfile(user_id=student.id)
            session.add(profile)

            print(f"[OK] Created test student: student@test.com / 123456")

        await session.commit()

    await engine.dispose()
    print("\n[OK] Database initialization complete!")
    print("\nTest accounts:")
    print("  - Teacher: teacher@test.com / 123456")
    print("  - Student: student@test.com / 123456")

if __name__ == "__main__":
    asyncio.run(init_db())
