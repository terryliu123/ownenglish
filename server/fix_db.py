"""Fix live_sessions table - add missing group_id column."""
import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy import text
from app.db.session import engine


async def fix_live_sessions():
    """Add group_id column to live_sessions table."""
    async with engine.begin() as conn:
        # 检查字段是否存在
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'live_sessions' AND column_name = 'group_id'
        """))

        if result.scalar():
            print("group_id column already exists in live_sessions")
        else:
            print("Adding group_id column to live_sessions...")
            await conn.execute(text("""
                ALTER TABLE live_sessions
                ADD COLUMN group_id VARCHAR(36) REFERENCES live_task_groups(id)
            """))
            print("Done!")

        # 检查 live_tasks 的 session_id
        result2 = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'live_tasks' AND column_name = 'session_id'
        """))

        if result2.scalar():
            print("session_id column already exists in live_tasks")
        else:
            print("Adding session_id column to live_tasks...")
            await conn.execute(text("""
                ALTER TABLE live_tasks
                ADD COLUMN session_id VARCHAR(36) REFERENCES live_sessions(id)
            """))
            print("Done!")

    print("Database fix complete!")


if __name__ == "__main__":
    asyncio.run(fix_live_sessions())
