"""Reset database tables - use in development only."""
import asyncio
import sys

sys.path.insert(0, "app")

from app.db.session import engine, Base
from app.core.config import get_settings

settings = get_settings()


async def reset_db():
    """Drop all tables and recreate them."""
    if settings.ENVIRONMENT == "production":
        print("ERROR: Cannot reset database in production!")
        sys.exit(1)

    print(f"Database URL: {settings.DATABASE_URL}")
    print("Dropping all tables...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    print("Recreating tables...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Database reset complete!")


if __name__ == "__main__":
    asyncio.run(reset_db())
