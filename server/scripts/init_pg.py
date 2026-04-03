"""Initialize PostgreSQL database with test accounts."""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from datetime import datetime, timezone

# Import all models to ensure tables are created
from app.models import (
    Base, User, TeacherProfile, StudentProfile, UserRole,
    Class, ClassEnrollment, Course, GuestSession,
    StudyPack, PracticeModule, Submission,
    LiveTaskGroup, LiveTask, LiveSession, LiveSubmission, LiveTaskGroupSubmission,
    VerificationCode, PasswordResetToken
)
from app.core.security import get_password_hash

# Get database URL from environment or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:123456@localhost:5432/ownenglish"
)

print(f"Using database: {DATABASE_URL.replace('postgres://', 'postgresql://').split('@')[0].split(':')[0]}://***@***")


async def init_db():
    """Create tables and test accounts."""
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Create all tables
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
                is_active=True,
                is_guest=False,
            )
            session.add(teacher)
            await session.flush()

            profile = TeacherProfile(user_id=teacher.id)
            session.add(profile)

            print(f"[OK] Created test teacher: teacher@test.com / 123456")
        else:
            print("[SKIP] Test teacher already exists")

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
                is_active=True,
                is_guest=False,
            )
            session.add(student)
            await session.flush()

            profile = StudentProfile(user_id=student.id)
            session.add(profile)

            print(f"[OK] Created test student: student@test.com / 123456")
        else:
            print("[SKIP] Test student already exists")

        await session.commit()

    await engine.dispose()
    print("\n[OK] Database initialization complete!")
    print("\nTest accounts:")
    print("  - Teacher: teacher@test.com / 123456")
    print("  - Student: student@test.com / 123456")

if __name__ == "__main__":
    asyncio.run(init_db())
